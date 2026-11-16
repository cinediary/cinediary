package com.cinediary.api.shared.infrastructure.config;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.support.TaskExecutorAdapter;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** {@code @Async} (importação do Letterboxd) em virtual threads e {@code @Scheduled} (relay do Outbox). */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig
{
    public static final String IMPORT_EXECUTOR = "importExecutor";

    @Bean(name = IMPORT_EXECUTOR)
    Executor importExecutor()
    {
        return new TaskExecutorAdapter(Executors.newThreadPerTaskExecutor(
                Thread.ofVirtual().name("letterboxd-import-", 0).factory()));
    }
}
