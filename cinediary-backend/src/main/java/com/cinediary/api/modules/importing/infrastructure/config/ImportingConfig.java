package com.cinediary.api.modules.importing.infrastructure.config;

import com.cinediary.api.modules.importing.domain.ImportLimits;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ImportingConfig
{
    @Bean
    ImportLimits importLimits(ImportingProperties p)
    {
        return new ImportLimits(p.maxZipBytes(), p.maxUncompressedBytes(), p.maxEntries(), p.maxItems(),
                p.tmdbParallelism());
    }
}
