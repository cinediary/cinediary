package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.social.domain.Activity;
import com.cinediary.api.modules.social.domain.ActivityKind;
import com.cinediary.api.modules.social.domain.ActivityPort;
import com.cinediary.api.modules.social.domain.EntryInteractionsPort;
import com.cinediary.api.modules.social.domain.Follow;
import com.cinediary.api.modules.social.domain.FollowPolicy;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aba "Amigos" do sino (como a atividade do Letterboxd): o que você e quem você segue fizeram, mais recente
 * primeiro. Junta duas fontes por data:
 * - os registros do diário (assistiu, reviu, escreveu review), lidos na hora;
 * - o resto (seguiu alguém, curtiu ou respondeu uma review, pôs na watchlist), guardado em {@code activities}.
 * Curtida/resposta numa review de um perfil privado que você não segue não aparece.
 */
@Service
@RequiredArgsConstructor
public class GetFriendsActivityUseCase
{
    private static final int MAX_FOLLOWING = 1000;

    private final FollowRepositoryPort follows;
    private final ActivityPort activities;
    private final DiaryModulePort diary;
    private final UsersModulePort users;
    private final EntryInteractionsPort interactions;
    private final CatalogModulePort catalog;

    @Transactional(readOnly = true)
    public List<ActivityItem> execute(UUID viewerId, Instant before, int limit)
    {
        List<UUID> actors = new ArrayList<>(follows.followingIds(viewerId, MAX_FOLLOWING));
        actors.add(viewerId);

        // As duas fontes já vêm ordenadas; pega `limit` de cada antes do cursor e junta.
        List<DiaryEntryView> logs = diary.recentEntriesOf(actors, before, limit, viewerId);
        List<Activity> rest = activities.of(actors, before, limit);

        Set<UUID> people = new HashSet<>(actors);
        rest.stream().map(Activity::targetUserId).filter(Objects::nonNull).forEach(people::add);
        Map<UUID, UserView> byId = new HashMap<>();
        users.findByIds(people).forEach(u -> byId.put(u.id(), u));

        Map<UUID, DiaryEntryView> entries = new HashMap<>();
        diary.entriesByIds(rest.stream().map(Activity::entryId).filter(Objects::nonNull).distinct().toList(), viewerId)
                .forEach(e -> entries.put(e.id(), e));
        Map<UUID, String> texts = interactions.commentTexts(rest.stream().map(Activity::commentId).filter(Objects::nonNull).toList());
        Map<Long, TitleSummaryView> titles = new HashMap<>();
        catalog.summaries(rest.stream().map(Activity::titleId).filter(Objects::nonNull).distinct().toList(), viewerId)
                .forEach(t -> titles.put(t.id(), t));
        Map<UUID, Follow> mine = follows.findAllFrom(viewerId, byId.keySet());

        List<ActivityItem> out = new ArrayList<>();
        for (DiaryEntryView e : logs) {
            UserView actor = byId.get(e.userId());
            if (actor != null) {
                out.add(new ActivityItem("log:" + e.id(), ActivityKind.LOGGED, actor, null, e, null, null, e.createdAt()));
            }
        }
        for (Activity a : rest) {
            UserView actor = byId.get(a.actorId());
            if (actor == null) {
                continue; // conta excluída
            }
            if (a.kind() == ActivityKind.WATCHLISTED) {
                TitleSummaryView title = titles.get(a.titleId());
                if (title != null) {
                    out.add(new ActivityItem("act:" + a.id(), a.kind(), actor, null, null, null, title, a.createdAt()));
                }
                continue;
            }
            UserView target = byId.get(a.targetUserId());
            if (target == null) {
                continue;
            }
            DiaryEntryView entry = a.entryId() == null ? null : entries.get(a.entryId());
            if (a.entryId() != null) {
                // A review de alguém privado que você não segue não aparece (nem a curtida nela).
                Relationship rel = Relationship.of(target.id().equals(viewerId), Optional.ofNullable(mine.get(target.id())));
                if (entry == null || !FollowPolicy.canSeeContent(rel, target.isPrivate())) {
                    continue;
                }
            }
            out.add(new ActivityItem("act:" + a.id(), a.kind(), actor, target, entry,
                    a.commentId() == null ? null : texts.get(a.commentId()), null, a.createdAt()));
        }
        out.sort(Comparator.comparing(ActivityItem::createdAt).reversed());
        return out.size() > limit ? out.subList(0, limit) : out;
    }
}
