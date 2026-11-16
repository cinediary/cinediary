package com.cinediary.api.modules.importing.presentation.dto;

import com.cinediary.api.modules.importing.domain.FavoritesMode;

/** Corpo opcional do confirmar: sem ele (ou sem favoritesMode), os favoritos do Letterboxd substituem os atuais. */
public record ConfirmImportRequest(FavoritesMode favoritesMode)
{
    public FavoritesMode modeOrDefault()
    {
        return favoritesMode == null ? FavoritesMode.REPLACE : favoritesMode;
    }
}
