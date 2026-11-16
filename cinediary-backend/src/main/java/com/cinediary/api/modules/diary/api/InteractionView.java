package com.cinediary.api.modules.diary.api;

import java.math.BigDecimal;

/**
 * Uma interação do usuário com um título, para o Taste Match (estado do diário ou sinal do onboarding).
 * {@code signalOnly}: veio do onboarding sem "Adicionar ao meu histórico".
 */
public record InteractionView(long titleId, BigDecimal rating, boolean liked, boolean favorite, boolean watched,
                              boolean signalOnly)
{
}
