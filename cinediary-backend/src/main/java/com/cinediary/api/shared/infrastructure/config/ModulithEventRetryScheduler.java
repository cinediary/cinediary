package com.cinediary.api.shared.infrastructure.config;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.modulith.events.IncompleteEventPublications;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Reenvia periodicamente as publicações do Spring Modulith que não completaram (ex.: o Neo4j estava fora quando o
 * listener rodou). Os listeners são idempotentes, então reprocessar é seguro.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "cinediary.events.resubmit-enabled", havingValue = "true", matchIfMissing = true)
class ModulithEventRetryScheduler
{
    private final IncompleteEventPublications incompletePublications;

    @Value("${cinediary.events.resubmit-older-than:30s}")
    private Duration olderThan;

    @Scheduled(fixedDelayString = "${cinediary.events.resubmit-interval:30s}", initialDelayString = "30s")
    void resubmitIncomplete()
    {
        try {
            incompletePublications.resubmitIncompletePublicationsOlderThan(olderThan);
        } catch (RuntimeException e) {
            log.warn("Falha ao reenviar eventos pendentes: {}", e.getMessage());
        }
    }
}
