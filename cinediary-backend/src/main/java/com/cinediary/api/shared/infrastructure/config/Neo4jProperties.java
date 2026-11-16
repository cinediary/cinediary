package com.cinediary.api.shared.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("cinediary.neo4j")
public record Neo4jProperties(boolean enabled, String uri, String username, String password)
{
}
