package com.cinediary.api.modules.importing.domain;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * O que fazer com os favoritos do Letterboxd quando a pessoa já tem favoritos no app (máximo de 4).
 * Sem conflito (um dos dois lados vazio) não há escolha: entram os que existem.
 */
public enum FavoritesMode
{
    /** Mantém os do app; a importação não mexe nos favoritos. */
    KEEP,
    /** Usa os do Letterboxd, na ordem do perfil de lá. */
    REPLACE,
    /** Os do app primeiro e os do Letterboxd completando as vagas, sem repetir filme. */
    MERGE;

    public static final int MAX = 4;

    /** Favoritos finais, ou null quando nada deve mudar. */
    public List<Long> resolve(List<Long> current, List<Long> imported)
    {
        if (imported.isEmpty()) {
            return null;
        }
        if (current.isEmpty()) {
            return limit(imported);
        }
        return switch (this) {
            case KEEP -> null;
            case REPLACE -> limit(imported);
            case MERGE -> {
                LinkedHashSet<Long> merged = new LinkedHashSet<>(current);
                merged.addAll(imported);
                yield limit(new ArrayList<>(merged));
            }
        };
    }

    private static List<Long> limit(List<Long> ids)
    {
        return ids.stream().distinct().limit(MAX).toList();
    }
}
