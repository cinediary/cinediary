package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.social.domain.CompanionStatus;
import com.cinediary.api.modules.social.domain.EntryCompanionsPort;
import com.cinediary.api.modules.social.domain.EntryInteractionsPort;
import com.cinediary.api.modules.social.domain.Follow;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.Notification;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** O sino: avisos agrupados (curtidas no mesmo registro viram uma linha só), não vistos e marcar como visto. */
@Service
@RequiredArgsConstructor
public class NotificationsUseCase
{
    private static final int WINDOW = 150;
    private static final int MAX_ACTORS = 3;

    private final NotificationsPort notifications;
    private final UsersModulePort users;
    private final DiaryModulePort diary;
    private final EntryInteractionsPort interactions;
    private final FollowRepositoryPort follows;
    private final EntryCompanionsPort companions;

    @Transactional(readOnly = true)
    public List<NotificationItem> list(UUID recipientId)
    {
        List<Notification> rows = notifications.latest(recipientId, WINDOW);

        // Agrupa: curtidas por registro; o resto, uma linha cada (a ordem é a do mais recente de cada grupo).
        Map<String, List<Notification>> groups = new LinkedHashMap<>();
        for (Notification n : rows) {
            String key = n.kind().groupsByEntry() ? n.kind() + ":" + n.entryId()
                    : n.kind().groupsByList() ? n.kind() + ":" + n.listId() : n.id().toString();
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(n);
        }

        Map<UUID, UserView> people = new HashMap<>();
        users.findByIds(rows.stream().map(Notification::actorId).distinct().toList()).forEach(u -> people.put(u.id(), u));
        Map<UUID, DiaryEntryView> entries = new HashMap<>();
        diary.entriesByIds(rows.stream().map(Notification::entryId).filter(Objects::nonNull).distinct().toList(), recipientId)
                .forEach(e -> entries.put(e.id(), e));
        Map<UUID, String> texts = interactions.commentTexts(rows.stream().map(Notification::commentId).filter(Objects::nonNull).distinct().toList());
        Map<UUID, Follow> mine = follows.findAllFrom(recipientId, people.keySet());
        Map<UUID, CompanionStatus> marked = companions.statusesOf(recipientId, rows.stream()
                .filter(n -> n.kind() == NotificationKind.ENTRY_COMPANION).map(Notification::entryId).distinct().toList());

        List<NotificationItem> out = new ArrayList<>();
        groups.forEach((key, list) -> {
            Notification first = list.getFirst();
            List<UserView> actors = list.stream().map(n -> people.get(n.actorId())).filter(Objects::nonNull).distinct().toList();
            if (actors.isEmpty() || (first.entryId() != null && !entries.containsKey(first.entryId()))) {
                return; // conta excluída ou registro apagado
            }
            CompanionStatus companionStatus = first.kind() == NotificationKind.ENTRY_COMPANION ? marked.get(first.entryId()) : null;
            if (first.kind() == NotificationKind.ENTRY_COMPANION && (companionStatus == null || companionStatus == CompanionStatus.DECLINED)) {
                return; // a marcação foi tirada ou recusada
            }
            Relationship rel = Relationship.of(false, Optional.ofNullable(mine.get(actors.getFirst().id())));
            out.add(new NotificationItem(key, first.kind(), actors.subList(0, Math.min(MAX_ACTORS, actors.size())), actors.size(),
                    first.entryId() == null ? null : entries.get(first.entryId()),
                    first.commentId() == null ? null : texts.get(first.commentId()),
                    first.createdAt(), list.stream().anyMatch(Notification::unseen), rel, companionStatus,
                    first.listId() == null ? null : new ListRef(first.listId(), first.listName())));
        });
        return out;
    }

    @Transactional(readOnly = true)
    public long unseenCount(UUID recipientId)
    {
        return notifications.countUnseen(recipientId);
    }

    @Transactional
    public void markAllSeen(UUID recipientId)
    {
        notifications.markAllSeen(recipientId);
    }
}
