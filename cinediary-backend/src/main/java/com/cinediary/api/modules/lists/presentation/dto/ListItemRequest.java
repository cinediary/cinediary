package com.cinediary.api.modules.lists.presentation.dto;

/** Adicionar um título à lista (no fim), com a nota opcional; ou só a nota, ao editar (titleId é ignorado). */
public record ListItemRequest(Long titleId, String note)
{
}
