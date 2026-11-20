package com.cinediary.api.modules.social.presentation.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** O seu registro do mesmo título, que ganha "vi com" quem te marcou. */
public record LinkOwnEntryRequest(@NotNull UUID entryId)
{
}
