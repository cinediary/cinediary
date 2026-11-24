package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.lists.domain.ListItem;
import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Monta as respostas das listas em lote: donos, contagens, capas e títulos numa consulta cada. */
@Component
@RequiredArgsConstructor
class ListAssembler
{
    /** Pôsteres na capa (o mosaico usa 4). */
    static final int COVER_POSTERS = 4;

    private final ListsRepositoryPort lists;
    private final UsersModulePort users;
    private final CatalogModulePort catalog;

    List<ListResults.Summary> summaries(List<UserList> all, UUID viewerId)
    {
        if (all.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = all.stream().map(UserList::id).toList();
        Map<UUID, UserView> owners = users.findByIds(all.stream().map(UserList::ownerId).distinct().toList()).stream()
                .collect(Collectors.toMap(UserView::id, Function.identity()));
        Map<UUID, Integer> counts = lists.itemCounts(ids);
        Map<UUID, List<Long>> covers = lists.coverTitles(ids, COVER_POSTERS);
        Map<Long, TitleSummaryView> titles = titles(covers.values().stream().flatMap(List::stream).distinct().toList(), viewerId);
        return all.stream()
                .map(l -> new ListResults.Summary(l, owners.get(l.ownerId()), counts.getOrDefault(l.id(), 0),
                        covers.getOrDefault(l.id(), List.of()).stream()
                                .map(titles::get).filter(Objects::nonNull).map(TitleSummaryView::posterUrl).toList()))
                .toList();
    }

    ListResults.Detail detail(UserList list, UUID viewerId)
    {
        List<ListItem> items = lists.items(list.id());
        Map<Long, TitleSummaryView> titles = titles(items.stream().map(ListItem::titleId).toList(), viewerId);
        List<ListResults.Item> out = items.stream()
                .filter(i -> titles.containsKey(i.titleId()))
                .map(i -> new ListResults.Item(titles.get(i.titleId()), i.position(), i.note()))
                .toList();
        return new ListResults.Detail(summaries(List.of(list), viewerId).getFirst(), out);
    }

    private Map<Long, TitleSummaryView> titles(Collection<Long> ids, UUID viewerId)
    {
        return ids.isEmpty() ? Map.of()
                : catalog.summaries(List.copyOf(ids), viewerId).stream()
                        .collect(Collectors.toMap(TitleSummaryView::id, Function.identity(), (a, b) -> a));
    }
}
