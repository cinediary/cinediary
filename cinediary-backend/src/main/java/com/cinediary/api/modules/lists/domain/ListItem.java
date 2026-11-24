package com.cinediary.api.modules.lists.domain;

/** Um título numa lista, na posição (a partir de 1), com a nota da pessoa sobre ele nesta lista. */
public record ListItem(long titleId, int position, String note)
{
}
