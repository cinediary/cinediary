package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.social.application.TitleCommunity;
import com.cinediary.api.modules.users.api.UserView;
import java.math.BigDecimal;
import java.util.List;

/** Lado social da página do título. {@code rating} nulo = ninguém deu nota (nem no TMDB). */
public record TitleCommunityResponse(Rating rating, List<Review> friends, List<Review> reviews, int reviewCount)
{
    /** {@code histogram}: 10 posições (0,5 … 5) ou vazio enquanto o app tem poucas notas. */
    public record Rating(BigDecimal average, long count, List<Long> histogram)
    {
    }

    public record Review(PersonEntryResponse entry, FeedResponse.Author author, long likeCount, long commentCount)
    {
        public static Review from(TitleCommunity.Review r)
        {
            UserView u = r.author();
            return new Review(PersonEntryResponse.from(r.entry()), new FeedResponse.Author(u.id(), u.username(), u.displayName(), u.avatarUrl()),
                    r.likeCount(), r.commentCount());
        }
    }

    public static TitleCommunityResponse from(TitleCommunity c)
    {
        TitleCommunity.Rating r = c.rating();
        return new TitleCommunityResponse(r == null ? null : new Rating(r.average(), r.count(), r.histogram()),
                c.friends().stream().map(Review::from).toList(), c.reviews().stream().map(Review::from).toList(), c.reviewCount());
    }
}
