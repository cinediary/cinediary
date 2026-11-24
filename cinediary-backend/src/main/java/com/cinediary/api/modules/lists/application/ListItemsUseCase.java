package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.lists.domain.ListItem;
import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import com.cinediary.api.shared.domain.ConflictException;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os títulos de uma lista (#19): adicionar (no fim), tirar, reordenar e a nota de cada um. Só o dono mexe; cada
 * mudança trava a lista (as posições não se embaralham com duas mudanças ao mesmo tempo) e a faz subir no perfil.
 */
@Service
@RequiredArgsConstructor
public class ListItemsUseCase
{
    /** Nota de um título na lista. */
    public static final int MAX_NOTE = 1000;

    private final ListsRepositoryPort lists;
    private final ListAccess access;
    private final ListAssembler assembler;
    private final CatalogModulePort catalog;

    /** Em quais das suas listas o título está, para o app marcar na folha "Adicionar à lista". */
    public record Membership(ListResults.Summary list, boolean containsTitle)
    {
    }

    @Transactional
    public ListResults.Detail add(UUID userId, UUID listId, long titleId, String note)
    {
        UserList list = locked(userId, listId);
        if (catalog.findTitle(titleId).isEmpty()) {
            throw new NotFoundException("Título não encontrado");
        }
        if (lists.contains(listId, titleId)) {
            throw new ConflictException("Este título já está na lista");
        }
        if (lists.itemCounts(List.of(listId)).getOrDefault(listId, 0) >= UserList.MAX_ITEMS) {
            throw new DomainValidationException("Uma lista pode ter no máximo " + UserList.MAX_ITEMS + " títulos");
        }
        lists.append(listId, titleId, cleanNote(note));
        lists.touch(listId);
        return assembler.detail(list, userId);
    }

    @Transactional
    public ListResults.Detail remove(UUID userId, UUID listId, long titleId)
    {
        UserList list = locked(userId, listId);
        if (!lists.remove(listId, titleId)) {
            throw new NotFoundException("Este título não está na lista");
        }
        lists.touch(listId);
        return assembler.detail(list, userId);
    }

    /** A ordem nova precisa ter exatamente os títulos da lista, cada um uma vez. */
    @Transactional
    public ListResults.Detail reorder(UUID userId, UUID listId, List<Long> titleIds)
    {
        UserList list = locked(userId, listId);
        Set<Long> current = new HashSet<>(lists.items(listId).stream().map(ListItem::titleId).toList());
        if (titleIds == null || titleIds.size() != current.size() || !current.equals(new HashSet<>(titleIds))) {
            throw new DomainValidationException("A ordem precisa ter todos os títulos da lista, cada um uma vez");
        }
        lists.reorder(listId, titleIds);
        lists.touch(listId);
        return assembler.detail(list, userId);
    }

    @Transactional
    public ListResults.Detail note(UUID userId, UUID listId, long titleId, String note)
    {
        UserList list = locked(userId, listId);
        if (!lists.updateNote(listId, titleId, cleanNote(note))) {
            throw new NotFoundException("Este título não está na lista");
        }
        lists.touch(listId);
        return assembler.detail(list, userId);
    }

    /** As suas listas, cada uma dizendo se tem o título. */
    @Transactional(readOnly = true)
    public List<Membership> myLists(UUID userId, long titleId)
    {
        Set<UUID> containing = lists.listsContaining(userId, titleId);
        return assembler.summaries(lists.listsOf(userId, true), userId).stream()
                .map(s -> new Membership(s, containing.contains(s.list().id())))
                .toList();
    }

    private UserList locked(UUID userId, UUID listId)
    {
        UserList list = access.owned(userId, listId);
        lists.lock(listId);
        return list;
    }

    private static String cleanNote(String note)
    {
        String clean = note == null || note.isBlank() ? null : note.strip();
        if (clean != null && clean.length() > MAX_NOTE) {
            throw new DomainValidationException("A nota pode ter no máximo " + MAX_NOTE + " caracteres");
        }
        return clean;
    }
}
