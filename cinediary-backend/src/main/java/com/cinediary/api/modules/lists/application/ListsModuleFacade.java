package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.lists.api.ImportedList;
import com.cinediary.api.modules.lists.api.ListsModulePort;
import com.cinediary.api.modules.lists.domain.ListItem;
import com.cinediary.api.modules.lists.domain.ListVisibility;
import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** O módulo de listas visto de fora (ListsModulePort): a importação grava as listas por aqui. */
@Service
@RequiredArgsConstructor
public class ListsModuleFacade implements ListsModulePort
{
    private final ListsRepositoryPort lists;

    @Override
    @Transactional
    public int importLists(UUID userId, String source, List<ImportedList> imported)
    {
        int written = 0;
        for (ImportedList in : imported) {
            // Nome ou descrição maiores que o app aceita: cortados (não derrubam a importação inteira).
            String name = cut(in.name(), UserList.MAX_NAME);
            String description = cut(in.description(), UserList.MAX_DESCRIPTION);
            if (name == null) {
                continue;
            }
            UserList list = lists.findImported(userId, source, name)
                    // Reimportar: descrição e títulos de novo; nome, ranking e quem vê ficam como a pessoa deixou.
                    .map(existing -> lists.update(existing.with(null, description == null ? "" : description, null, null)))
                    .orElseGet(() -> lists.createImported(
                            UserList.create(userId, name, description, in.ranked(), ListVisibility.PRIVATE), source));
            lists.replaceItems(list.id(), items(in));
            written++;
        }
        return written;
    }

    private static String cut(String text, int max)
    {
        String clean = text == null || text.isBlank() ? null : text.strip();
        return clean == null || clean.length() <= max ? clean : clean.substring(0, max).strip();
    }

    /** Os títulos na ordem, sem repetir, até o limite de uma lista. */
    private static List<ListItem> items(ImportedList in)
    {
        Set<Long> seen = new HashSet<>();
        List<ListItem> out = new java.util.ArrayList<>();
        for (ImportedList.Item i : in.items()) {
            if (out.size() == UserList.MAX_ITEMS) {
                break;
            }
            if (seen.add(i.titleId())) {
                String note = i.note() == null || i.note().isBlank() ? null : i.note().strip();
                if (note != null && note.length() > ListItemsUseCase.MAX_NOTE) {
                    note = note.substring(0, ListItemsUseCase.MAX_NOTE);
                }
                out.add(new ListItem(i.titleId(), out.size() + 1, note));
            }
        }
        return out;
    }
}
