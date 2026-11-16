# syntax=docker/dockerfile:1
# API empacotada: para mexer só no app (UI) com o backend rodando, sem o modo dev do Spring.
# `make dev` (na raiz) sobe isto pelo docker compose (perfil "app"). Para desenvolver o backend, use `make run`.

FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
# Dependências primeiro: mudar só o código não baixa tudo de novo.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon -q dependencies > /dev/null
COPY src src
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon -q bootJar -x test \
    && find build/libs -name '*.jar' ! -name '*-plain.jar' -exec cp {} /app/app.jar \;

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --uid 1001 cinediary
COPY --from=build /app/app.jar app.jar
USER cinediary
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
