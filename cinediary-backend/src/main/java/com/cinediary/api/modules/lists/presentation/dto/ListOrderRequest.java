package com.cinediary.api.modules.lists.presentation.dto;

import java.util.List;

/** A ordem nova da lista: todos os títulos, cada um uma vez. */
public record ListOrderRequest(List<Long> titleIds)
{
}
