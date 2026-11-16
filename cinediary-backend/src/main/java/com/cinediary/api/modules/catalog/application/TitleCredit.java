package com.cinediary.api.modules.catalog.application;

/** Pessoa nos créditos de um título, com a URL da foto já montada. */
public record TitleCredit(long personId, String name, String role, String photoUrl, boolean director)
{
}
