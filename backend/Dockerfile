# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

# Copy root POM first to leverage layer caching
COPY pom.xml ./

# Copy all module POMs
COPY flavortales-common/pom.xml flavortales-common/pom.xml
COPY flavortales-user/pom.xml flavortales-user/pom.xml
COPY flavortales-notification/pom.xml flavortales-notification/pom.xml
COPY flavortales-auth/pom.xml flavortales-auth/pom.xml
COPY flavortales-analytics/pom.xml flavortales-analytics/pom.xml
COPY flavortales-file/pom.xml flavortales-file/pom.xml
COPY flavortales-location/pom.xml flavortales-location/pom.xml
COPY flavortales-moderation/pom.xml flavortales-moderation/pom.xml
COPY flavortales-poi/pom.xml flavortales-poi/pom.xml
COPY flavortales-audio/pom.xml flavortales-audio/pom.xml
COPY flavortales-content/pom.xml flavortales-content/pom.xml
COPY flavortales-search/pom.xml flavortales-search/pom.xml
COPY flavortales-app/pom.xml flavortales-app/pom.xml

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy all source files
COPY flavortales-common/src flavortales-common/src
COPY flavortales-user/src flavortales-user/src
COPY flavortales-notification/src flavortales-notification/src
COPY flavortales-auth/src flavortales-auth/src
COPY flavortales-analytics/src flavortales-analytics/src
COPY flavortales-file/src flavortales-file/src
COPY flavortales-location/src flavortales-location/src
COPY flavortales-moderation/src flavortales-moderation/src
COPY flavortales-poi/src flavortales-poi/src
COPY flavortales-audio/src flavortales-audio/src
COPY flavortales-content/src flavortales-content/src
COPY flavortales-search/src flavortales-search/src
COPY flavortales-app/src flavortales-app/src

# Build the runnable JAR (skip tests for faster image build)
RUN mvn -pl flavortales-app -am clean package -DskipTests -B

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY --from=builder /workspace/flavortales-app/target/flavortales-app-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
