package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Feed: o que as pessoas que você segue (aprovadas) registraram no app, mais recentes primeiro. Montado na
 * leitura a partir dos diários; as importações do Letterboxd ficam de fora (uma importação de 400 filmes não
 * pode encher o feed de uma vez).
 */
@Service
@RequiredArgsConstructor
public class GetFeedUseCase
{
    /** Segue mais que isso: o feed usa os primeiros (suficiente para o MVP). */
    private static final int MAX_FOLLOWING = 1000;

    private final FollowRepositoryPort follows;
    private final DiaryModulePort diary;
    private final UsersModulePort users;

    @Transactional(readOnly = true)
    public List<FeedItem> execute(UUID viewerId, Instant before, int limit)
    {
        List<UUID> following = follows.followingIds(viewerId, MAX_FOLLOWING);
        if (following.isEmpty()) {
            return List.of();
        }
        var entries = diary.recentEntriesOf(following, before, Math.clamp(limit, 1, 50), viewerId);
        Map<UUID, UserView> authors = new HashMap<>();
        users.findByIds(entries.stream().map(e -> e.userId()).distinct().toList()).forEach(u -> authors.put(u.id(), u));
        return entries.stream().filter(e -> authors.containsKey(e.userId())).map(e -> new FeedItem(e, authors.get(e.userId()))).toList();
    }
}
