package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.users.api.UserView;
import java.math.BigDecimal;
import java.util.List;

/**
 * O lado social da página de um título.
 * - {@code rating}: nota consolidada (null sem nenhuma nota, nem do TMDB);
 * - {@code friends}: o último registro de quem você segue;
 * - {@code reviews}: até 3 (as de quem você segue primeiro, completadas pelas populares; sem as suas).
 */
public record TitleCommunity(Rating rating, List<Review> friends, List<Review> reviews, int reviewCount)
{
    /**
     * Uma nota só, de 0,5 a 5, juntando o TMDB e o CineDiary (ver {@link GetTitleCommunityUseCase}).
     * {@code histogram}: quantas pessoas deram 0,5, 1, …, 5 no app (10 posições); vem vazio até o app ter
     * notas suficientes para não enganar.
     */
    public record Rating(BigDecimal average, long count, List<Long> histogram)
    {
    }

    public record Review(DiaryEntryView entry, UserView author, long likeCount, long commentCount)
    {
    }
}
