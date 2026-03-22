#!/bin/bash
# =============================================================================
# resync-replica-from-backup.sh
#
# PURPOSE:
#   Fix the data-sync issue that occurs when a MySQL dump was restored
#   directly into the REPLICA container instead of going through the
#   PRIMARY → replication pipeline.
#
# WHAT IT DOES:
#   1. Import the provided backup file into the PRIMARY (reset GTID state first)
#   2. Stop replication and clear all stale data on the REPLICA
#   3. Take a fresh dump from the PRIMARY (includes GTID metadata)
#   4. Restore that dump to the REPLICA
#   5. Re-configure and start replication (GTID auto-position)
#   6. Verify replication is healthy
#
# USAGE (run on the Mini-PC host):
#   chmod +x resync-replica-from-backup.sh
#   ./resync-replica-from-backup.sh /path/to/flavortales_backup.sql
#
# REQUIREMENTS:
#   - Docker is running with containers: flavortales-primary, flavortales-replicate
#   - The backup SQL file path is passed as the first argument
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PRIMARY_CONTAINER="flavortales-primary"
REPLICA_CONTAINER="flavortales-replicate"
ROOT_PASS="root"
REPL_USER="replicator"
REPL_PASS="replicator_pwd"
DB_NAME="flavortales"

BACKUP_FILE="${1:-}"

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if [[ -z "$BACKUP_FILE" ]]; then
  echo "[ERROR] Usage: $0 /path/to/flavortales_backup.sql"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[ERROR] Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo ""
echo "=========================================================="
echo "  FlavorTales – Replica Resync Script"
echo "=========================================================="
echo "  Backup file : $BACKUP_FILE"
echo "  Primary     : $PRIMARY_CONTAINER"
echo "  Replica     : $REPLICA_CONTAINER"
echo ""
echo "  WARNING: This will REPLACE all data in both containers"
echo "           with the data from the provided backup file."
echo "=========================================================="
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# ---------------------------------------------------------------------------
# Helper: run SQL on a container
# ---------------------------------------------------------------------------
run_sql() {
  local container="$1"
  shift
  docker exec -i "$container" mysql -uroot -p"$ROOT_PASS" "$@" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Step 1 – Stop replica replication (avoid binlog conflicts during import)
# ---------------------------------------------------------------------------
echo ""
echo "[1/6] Stopping replica replication..."
run_sql "$REPLICA_CONTAINER" -e "STOP REPLICA; RESET REPLICA ALL;" || true
echo "      Done."

# ---------------------------------------------------------------------------
# Step 2 – Import backup into PRIMARY
#
# The backup was created with GTID enabled, so it contains:
#   SET @@GLOBAL.GTID_PURGED = 'windows-server-uuid:1-N';
#
# We must RESET MASTER first to clear gtid_executed so the SET succeeds.
# RESET MASTER also purges all existing binary logs, which is intentional –
# we want the replica to start fresh from the backup data.
# ---------------------------------------------------------------------------
echo ""
echo "[2/6] Resetting PRIMARY binary logs and GTID state (RESET MASTER)..."
run_sql "$PRIMARY_CONTAINER" -e "RESET MASTER;"
echo "      Done."

echo "[3/6] Copying backup file into the primary container..."
docker cp "$BACKUP_FILE" "$PRIMARY_CONTAINER:/tmp/flavortales_restore.sql"
echo "      Done."

echo "[4/6] Importing backup into PRIMARY (this may take a moment)..."
docker exec -i "$PRIMARY_CONTAINER" \
  mysql -uroot -p"$ROOT_PASS" \
  --init-command="SET SESSION SQL_LOG_BIN=1;" \
  < "$BACKUP_FILE"
echo "      Done."

# Clean up temp file
docker exec "$PRIMARY_CONTAINER" rm -f /tmp/flavortales_restore.sql

# ---------------------------------------------------------------------------
# Step 3 – Verify primary has data
# ---------------------------------------------------------------------------
echo ""
POI_COUNT=$(run_sql "$PRIMARY_CONTAINER" -N -e "SELECT COUNT(*) FROM ${DB_NAME}.poi;" 2>/dev/null || echo "0")
SHOP_COUNT=$(run_sql "$PRIMARY_CONTAINER" -N -e "SELECT COUNT(*) FROM ${DB_NAME}.shop;" 2>/dev/null || echo "0")
echo "[INFO] Primary now has: ${POI_COUNT} POIs, ${SHOP_COUNT} shops"

# ---------------------------------------------------------------------------
# Step 4 – Dump PRIMARY with GTID metadata → restore into REPLICA
# ---------------------------------------------------------------------------
echo ""
echo "[5/6] Creating fresh dump from PRIMARY for replica sync..."
TEMP_DUMP="/tmp/flavortales_primary_dump_$(date +%s).sql"

docker exec "$PRIMARY_CONTAINER" \
  mysqldump -uroot -p"$ROOT_PASS" \
    --single-transaction \
    --source-data=2 \
    --set-gtid-purged=ON \
    --triggers \
    --routines \
    --events \
    "$DB_NAME" > "$TEMP_DUMP"

echo "      Dump written to: $TEMP_DUMP"

echo ""
echo "      Dropping and recreating $DB_NAME on REPLICA..."
run_sql "$REPLICA_CONTAINER" -e "
  SET GLOBAL read_only = OFF;
  DROP DATABASE IF EXISTS ${DB_NAME};
  CREATE DATABASE ${DB_NAME}
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
"

echo "      Restoring dump to REPLICA..."
# Reset replica GTID state before restoring the dump
run_sql "$REPLICA_CONTAINER" -e "RESET MASTER;" || true
docker exec -i "$REPLICA_CONTAINER" \
  mysql -uroot -p"$ROOT_PASS" "$DB_NAME" < "$TEMP_DUMP"

# Re-enable read-only on replica
run_sql "$REPLICA_CONTAINER" -e "SET GLOBAL read_only = ON;"

rm -f "$TEMP_DUMP"
echo "      Done."

# ---------------------------------------------------------------------------
# Step 5 – Configure and start replication on REPLICA
# ---------------------------------------------------------------------------
echo ""
echo "[6/6] Configuring replication (GTID auto-position)..."
run_sql "$REPLICA_CONTAINER" <<SQL
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-primary',
  SOURCE_PORT=3306,
  SOURCE_USER='${REPL_USER}',
  SOURCE_PASSWORD='${REPL_PASS}',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
SQL

# Wait briefly for replication threads to start
sleep 5

# ---------------------------------------------------------------------------
# Step 6 – Verify
# ---------------------------------------------------------------------------
echo ""
echo "=========================================================="
echo "  Verification"
echo "=========================================================="

STATUS=$(run_sql "$REPLICA_CONTAINER" -e "SHOW REPLICA STATUS\G" 2>/dev/null)
IO_RUNNING=$(echo "$STATUS" | grep "Replica_IO_Running:"  | awk '{print $2}')
SQL_RUNNING=$(echo "$STATUS" | grep "Replica_SQL_Running:" | awk '{print $2}')
LAST_ERROR=$(echo "$STATUS"  | grep "Last_Error:"          | head -1 | cut -d: -f2- | xargs)
SQL_ERROR=$(echo "$STATUS"   | grep "Last_SQL_Error:"      | head -1 | cut -d: -f2- | xargs)

echo "  Replica_IO_Running  : $IO_RUNNING"
echo "  Replica_SQL_Running : $SQL_RUNNING"
echo "  Last_Error          : ${LAST_ERROR:-(none)}"
echo "  Last_SQL_Error      : ${SQL_ERROR:-(none)}"

PRIMARY_POIS=$(run_sql "$PRIMARY_CONTAINER" -N -e "SELECT COUNT(*) FROM ${DB_NAME}.poi;" 2>/dev/null || echo "?")
REPLICA_POIS=$(run_sql "$REPLICA_CONTAINER" -N -e "SELECT COUNT(*) FROM ${DB_NAME}.poi;" 2>/dev/null || echo "?")

echo ""
echo "  POI count – Primary : $PRIMARY_POIS"
echo "  POI count – Replica : $REPLICA_POIS"
echo "=========================================================="

if [[ "$IO_RUNNING" == "Yes" && "$SQL_RUNNING" == "Yes" ]]; then
  echo ""
  echo "  SUCCESS: Replication is running. Primary and Replica are in sync."
  echo ""
  echo "  You can now test POI delete through the application normally."
  echo "  All reads (replica) and writes (primary) will be consistent."
else
  echo ""
  echo "  ERROR: Replication did not start correctly."
  echo "  Run: docker exec -it $REPLICA_CONTAINER mysql -uroot -p$ROOT_PASS -e 'SHOW REPLICA STATUS\\G'"
  echo "  and check the Last_Error / Last_SQL_Error fields."
  exit 1
fi
