package com.cinediary.api.modules.match.presentation.dto;

import jakarta.validation.constraints.NotNull;

public record AddSharedWatchlistRequest(@NotNull Long titleId)
{
}
