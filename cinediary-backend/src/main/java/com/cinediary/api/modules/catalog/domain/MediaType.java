package com.cinediary.api.modules.catalog.domain;

public enum MediaType
{
    MOVIE("movie"),
    SERIES("tv");

    private final String tmdbPath;

    MediaType(String tmdbPath)
    {
        this.tmdbPath = tmdbPath;
    }

    public String tmdbPath()
    {
        return tmdbPath;
    }

    public static MediaType fromTmdb(String tmdbMediaType)
    {
        return switch (tmdbMediaType) {
            case "movie" -> MOVIE;
            case "tv" -> SERIES;
            default -> null;
        };
    }
}
