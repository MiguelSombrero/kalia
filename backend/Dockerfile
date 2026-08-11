# Build stage — tests run in CI, not in the image build
FROM maven:3.9-eclipse-temurin-25-noble AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

# Runtime stage
FROM eclipse-temurin:25-jre-noble
# curl is here only so the container can health-check itself: the image ships
# no HTTP client, and without one a compose healthcheck can do no better than
# probe whether the port is open. An orchestrator with its own HTTP probe
# (a Kubernetes httpGet) needs neither this nor the healthcheck.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*
RUN useradd --system --uid 1001 kalia
USER kalia
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
