package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.CompanionStatus;
import java.util.List;

/**
 * "Vi com…" de um registro para quem vê. {@code companions}: o dono vê todas as marcações (recusadas aparecem como
 * esperando, para não avisar quem marcou); os outros, só as aceitas. {@code myStatus}: se quem vê foi marcado.
 */
public record EntryCompanions(List<CompanionItem> companions, CompanionStatus myStatus)
{
}
