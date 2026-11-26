package com.cinediary.api.modules.catalog.application;

/** Um backdrop do TMDB: {@code path} é o que se salva (ex.: /abc.jpg); {@code url}, a imagem pronta. */
public record TitleBackdrop(String path, String url)
{
}
