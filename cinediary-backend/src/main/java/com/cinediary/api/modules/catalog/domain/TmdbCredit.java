package com.cinediary.api.modules.catalog.domain;

/**
 * Pessoa nos créditos de um título. {@code role} é o personagem (elenco) ou o cargo (ex.: direção);
 * {@code director} separa quem dirigiu de quem atuou.
 */
public record TmdbCredit(long personId, String name, String role, String profilePath, boolean director)
{
}
