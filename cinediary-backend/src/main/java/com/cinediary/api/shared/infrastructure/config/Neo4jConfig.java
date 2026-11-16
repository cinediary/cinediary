package com.cinediary.api.shared.infrastructure.config;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Config;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Driver Neo4j (Bolt) para o grafo do Taste Match. Criar o driver não abre conexão:
 * a API sobe mesmo com o Neo4j parado e o Match cai no fallback SQL.
 */
@Configuration
@ConditionalOnProperty(name = "cinediary.neo4j.enabled", havingValue = "true", matchIfMissing = true)
public class Neo4jConfig
{
    @Bean(destroyMethod = "close")
    Driver neo4jDriver(Neo4jProperties props)
    {
        Config config = Config.builder()
                .withConnectionTimeout(3, TimeUnit.SECONDS)
                .withConnectionAcquisitionTimeout(5, TimeUnit.SECONDS)
                .withMaxTransactionRetryTime(Duration.ofSeconds(5).toMillis(), TimeUnit.MILLISECONDS)
                .build();
        return GraphDatabase.driver(props.uri(), AuthTokens.basic(props.username(), props.password()), config);
    }
}
