package com.cinediary.api.modules.importing.domain;

/** Proteções do upload (ADR-05): tamanho do ZIP, zip bomb, quantidade de arquivos e de itens. */
public record ImportLimits(long maxZipBytes, long maxUncompressedBytes, int maxEntries, int maxItems,
                           int tmdbParallelism)
{
}
