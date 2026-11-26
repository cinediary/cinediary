package com.cinediary.api.modules.users.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Capa do perfil: o título (ID interno do catálogo) e um dos backdrops dele (o {@code path} da lista). */
public record UpdateHeaderRequest(@NotNull Long titleId, @NotBlank @Size(max = 100) String backdropPath)
{
}
