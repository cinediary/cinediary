package com.cinediary.api.modules.match.domain;

import java.util.Set;

/** O que o cálculo precisa saber de um título: gêneros e popularidade. */
public record TitleFacts(long titleId, Set<Integer> genreIds, double popularity)
{
}
