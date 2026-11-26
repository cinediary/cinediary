plugins {
    java
    id("org.springframework.boot") version "4.2.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.cinediary"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

dependencyManagement {
    imports {
        // Spring Modulith 2.1.x é a linha compatível com Spring Boot 4.1
        mavenBom("org.springframework.modulith:spring-modulith-bom:2.2.0")
    }
}

dependencies {
    // Web, validação e observabilidade
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-restclient")

    // Segurança: JWT do Clerk via OAuth2 Resource Server
    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")

    // Persistência: PostgreSQL + Spring Data JPA (upserts em @Query nativa) + Flyway
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // Webhooks do Clerk assinados pelo Svix
    implementation("com.svix:svix:2.10.0")

    // Spring Modulith: fronteiras de módulo + Event Publication Registry (Outbox nativo em event_publication)
    implementation("org.springframework.modulith:spring-modulith-starter-jpa")

    // Neo4j 5 + Graph Data Science (Taste Match). Driver puro, sem Spring Data Neo4j:
    // evita um segundo transaction manager concorrendo com o JPA.
    implementation("org.neo4j.driver:neo4j-java-driver")

    // OpenAPI / Swagger UI
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.1")

    compileOnly("org.projectlombok:lombok:1.18.48")
    annotationProcessor("org.projectlombok:lombok:1.18.48")
    testCompileOnly("org.projectlombok:lombok:1.18.48")
    testAnnotationProcessor("org.projectlombok:lombok:1.18.48")

    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.testcontainers:testcontainers-neo4j")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.5.1")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
