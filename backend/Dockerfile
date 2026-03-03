# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

# Copy entire source tree (filess.io uses repo root as build context)
COPY . .

# Build the runnable JAR; pom.xml is at /workspace/backend/ since filess.io uses repo root as build context
RUN mvn -f /workspace/backend/pom.xml clean package -DskipTests -B

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY --from=builder /workspace/backend/flavortales-app/target/flavortales-app-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
