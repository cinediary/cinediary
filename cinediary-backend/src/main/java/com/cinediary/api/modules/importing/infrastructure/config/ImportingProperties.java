package com.cinediary.api.modules.importing.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("cinediary.importing")
/** {@code shortLinkBaseUrl}: links curtos do Letterboxd (padrão https://boxd.it; nos testes, o servidor falso). */
public record ImportingProperties(long maxZipBytes, long maxUncompressedBytes, int maxEntries, int maxItems,
                                  int tmdbParallelism, String shortLinkBaseUrl)
{
}
