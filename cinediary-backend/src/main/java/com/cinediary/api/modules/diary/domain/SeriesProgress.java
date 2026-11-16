package com.cinediary.api.modules.diary.domain;

public record SeriesProgress(long titleId, int totalEpisodes, int watchedEpisodes, double progressPercentage,
                             SeriesStatus seriesStatus)
{
    /** Status automático: tudo visto = COMPLETED; algo visto = WATCHING; "Abandonada" só muda se a pessoa pedir. */
    public static SeriesStatus resolveStatus(SeriesStatus requested, SeriesStatus current, int watched, int total)
    {
        if (requested != null) {
            return requested;
        }
        if (total > 0 && watched >= total) {
            return SeriesStatus.COMPLETED;
        }
        if (watched > 0) {
            return current == SeriesStatus.DROPPED ? SeriesStatus.DROPPED : SeriesStatus.WATCHING;
        }
        return current == SeriesStatus.COMPLETED ? null : current;
    }

    public static double percentage(int watched, int total)
    {
        return total == 0 ? 0.0 : Math.round(watched * 1000.0 / total) / 10.0;
    }
}
