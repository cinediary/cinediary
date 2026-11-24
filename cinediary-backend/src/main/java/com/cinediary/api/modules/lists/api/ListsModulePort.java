package com.cinediary.api.modules.lists.api;

import java.util.List;
import java.util.UUID;

/** Única porta de entrada do módulo de listas para outros módulos. */
public interface ListsModulePort
{
    /**
     * Grava as listas importadas de {@code source} (ex.: LETTERBOXD) na conta. Uma lista nova nasce privada;
     * uma que já veio dessa fonte com o mesmo nome (sem diferenciar maiúsculas) é atualizada: a descrição e os
     * títulos na ordem nova (o nome, o ranking e quem vê ficam como a pessoa deixou). Não duplica ao reimportar.
     *
     * @return quantas listas foram criadas ou atualizadas
     */
    int importLists(UUID userId, String source, List<ImportedList> lists);
}
