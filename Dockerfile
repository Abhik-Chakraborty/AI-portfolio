# syntax=docker/dockerfile:1

# ---- Frontend build stage ----
# Builds the Vite/React SPA into static assets.
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend build stage ----
# Bundles the built SPA into Spring Boot's static resources, then builds the fat JAR.
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY backend/gradlew backend/build.gradle backend/settings.gradle ./
COPY backend/gradle ./gradle
RUN chmod +x gradlew
COPY backend/src ./src
# Anything in src/main/resources/static is served from the app root ("/"),
# so the SPA and the /api/** endpoints share a single origin (no CORS needed).
COPY --from=frontend /frontend/dist ./src/main/resources/static
RUN ./gradlew bootJar --no-daemon

# ---- Runtime stage ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
# server.port honors ${PORT} (Render injects it); 8081 is only the local default.
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
