package com.cinediary.api.modules.catalog.application;

import java.time.LocalDate;
import java.util.List;

/** Temporada pronta para a tela: episódios com nome, data, duração, imagem (URL) e sinopse. */
public record SeasonDetail(int number, String name, List<Episode> episodes)
{
    public record Episode(int number, String name, LocalDate airDate, Integer runtimeMinutes, String stillUrl,
                          String overview)
    {
    }
}
