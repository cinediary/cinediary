package com.cinediary.api.modules.social.application;

import java.util.UUID;

/** A lista envolvida num aviso ou numa atividade ("curtiu sua lista"): para mostrar o nome e abrir. */
public record ListRef(UUID id, String name)
{
}
