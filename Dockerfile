# ===== Build stage =====
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# Maven wrapper + descriptor first for better layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw -B -DskipTests dependency:go-offline

# Application sources
COPY src/ src/

# Build the Spring Boot executable JAR
RUN ./mvnw -B clean package -DskipTests

# ===== Runtime stage =====
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# Render injects PORT at runtime; Spring Boot reads it from application.yml.
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
