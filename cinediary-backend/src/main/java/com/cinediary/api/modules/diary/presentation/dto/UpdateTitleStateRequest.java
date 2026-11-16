package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.domain.SeriesStatus;
import com.cinediary.api.modules.diary.domain.TitleStateChange;
import java.math.BigDecimal;
import lombok.Getter;

/**
 * Campos ausentes não mudam nada. {@code "rating": null} apaga a nota: o setter registra que o campo veio.
 */
@Getter
public class UpdateTitleStateRequest
{
    private Boolean watched;
    private BigDecimal rating;
    private boolean ratingPresent;
    private Boolean liked;
    private Boolean inWatchlist;
    private SeriesStatus seriesStatus;

    public void setWatched(Boolean watched)
    {
        this.watched = watched;
    }

    public void setRating(BigDecimal rating)
    {
        this.rating = rating;
        this.ratingPresent = true;
    }

    public void setLiked(Boolean liked)
    {
        this.liked = liked;
    }

    public void setInWatchlist(Boolean inWatchlist)
    {
        this.inWatchlist = inWatchlist;
    }

    public void setSeriesStatus(SeriesStatus seriesStatus)
    {
        this.seriesStatus = seriesStatus;
    }

    public TitleStateChange toChange()
    {
        return new TitleStateChange(watched, ratingPresent, rating, liked, inWatchlist, seriesStatus);
    }
}
