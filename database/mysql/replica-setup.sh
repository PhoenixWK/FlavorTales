#!/bin/bash
# =============================================================================
# replica-setup.sh
# Configures MySQL replication on mysql-replicate pointing to mysql-primary.
# Runs once as a Docker one-shot service after both containers are healthy.
# =============================================================================
set -e

PRIMARY_HOST="mysql-primary"
REPLICA_HOST="mysql-replicate"
ROOT_PASS="root"
REPL_USER="replicator"
REPL_PASS="replicator_pwd"

echo "[Replication Setup] Checking current replica status..."

# If replication is already running, skip setup
REPLICA_IO=$(mysql -h"$REPLICA_HOST" -uroot -p"$ROOT_PASS" \
  -e "SHOW REPLICA STATUS\G" 2>/dev/null \
  | grep "Replica_IO_Running:" | awk '{print $2}' || true)

if [ "$REPLICA_IO" = "Yes" ]; then
  echo "[Replication Setup] Replication is already running. Nothing to do."
  exit 0
fi

echo "[Replication Setup] Stopping any existing replica..."
mysql -h"$REPLICA_HOST" -uroot -p"$ROOT_PASS" \
  -e "STOP REPLICA; RESET REPLICA ALL;" 2>/dev/null || true

echo "[Replication Setup] Configuring CHANGE REPLICATION SOURCE..."
mysql -h"$REPLICA_HOST" -uroot -p"$ROOT_PASS" <<SQL
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='${PRIMARY_HOST}',
  SOURCE_PORT=3306,
  SOURCE_USER='${REPL_USER}',
  SOURCE_PASSWORD='${REPL_PASS}',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
SQL

echo "[Replication Setup] Verifying replication status..."
sleep 3

STATUS=$(mysql -h"$REPLICA_HOST" -uroot -p"$ROOT_PASS" \
  -e "SHOW REPLICA STATUS\G" 2>/dev/null)

IO_RUNNING=$(echo "$STATUS" | grep "Replica_IO_Running:" | awk '{print $2}')
SQL_RUNNING=$(echo "$STATUS" | grep "Replica_SQL_Running:" | awk '{print $2}')

echo "[Replication Setup] Replica_IO_Running:  $IO_RUNNING"
echo "[Replication Setup] Replica_SQL_Running: $SQL_RUNNING"

if [ "$IO_RUNNING" = "Yes" ] && [ "$SQL_RUNNING" = "Yes" ]; then
  echo "[Replication Setup] ✓ Replication is running successfully."
else
  echo "[Replication Setup] ✗ Replication failed to start!"
  echo "$STATUS"
  exit 1
fi
