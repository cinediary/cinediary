package com.cinediary.api.modules.catalog.infrastructure.tmdb;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("cinediary.tmdb")
public record TmdbProperties(String baseUrl, String imageBaseUrl, String apiToken, String language, String region,
                             Duration detailsTtl, Duration connectTimeout, Duration readTimeout)
{

    public boolean hasToken()
    {
        return apiToken != null && !apiToken.isBlank();
    }

    public String posterUrl(String path)
    {
        return path == null ? null : imageBaseUrl + "/w500" + path;
    }

    public String stillUrl(String path)
    {
        return path == null ? null : imageBaseUrl + "/w300" + path;
    }

    public String logoUrl(String path)
    {
        return path == null ? null : imageBaseUrl + "/w185" + path;
    }

    public String profileUrl(String path)
    {
        return path == null ? null : imageBaseUrl + "/w185" + path;
    }

    public String backdropUrl(String path)
    {
        return path == null ? null : imageBaseUrl + "/w1280" + path;
    }
}
