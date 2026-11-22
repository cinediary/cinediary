package com.cinediary.api.modules.social.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** O novo texto de uma resposta: as mesmas regras de quando ela foi escrita. */
public record UpdateCommentRequest(@NotBlank @Size(max = 1000) String text)
{
}
