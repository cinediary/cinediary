package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.util.List;

/** Resultados das recomendações da Início. */
public final class Recommendations
{
    private Recommendations()
    {
    }

    /**
     * "Para você". {@code source} diz de onde veio, para o app explicar:
     * SIMILAR_USERS (gente com gosto parecido), TASTE (seus gêneros pelas notas),
     * ONBOARDING_GENRES (gêneros escolhidos no começo) ou NONE (sem sinal ainda: lista vazia).
     */
    public record ForYou(String source, List<String> genres, List<TitleSummaryView> items)
    {
    }

    /** "Porque você curtiu X": {@code seed} é null quando ainda não há um filme com nota alta. */
    public record BecauseYouLiked(TitleSummaryView seed, List<TitleSummaryView> items)
    {
    }
}
