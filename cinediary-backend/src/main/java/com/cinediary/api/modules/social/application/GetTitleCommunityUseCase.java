package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TmdbRatingView;
import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.RatingsView;
import com.cinediary.api.modules.social.domain.EntryInteractionsPort;
import com.cinediary.api.modules.social.domain.Follow;
import com.cinediary.api.modules.social.domain.FollowPolicy;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Página do título: nota consolidada, amigos que assistiram e reviews (as 3 de destaque e a lista completa).
 * As reviews são lidas do diário (até {@link #MAX_REVIEWS} por título) e ordenadas aqui; com a escala do MVP
 * isso basta e evita o social ler as tabelas do diário. Perfil privado só aparece para quem o segue.
 */
@Service
@RequiredArgsConstructor
public class GetTitleCommunityUseCase
{
    public enum Sort
    {
        POPULAR, RECENT, FRIENDS
    }

    static final int MAX_REVIEWS = 300;
    private static final int MAX_FOLLOWING = 1000;
    private static final int HIGHLIGHTS = 3;
    private static final int MAX_FRIENDS = 30;
    /** O TMDB vale no máximo como estas notas do app: com 50+ notas aqui, o CineDiary já pesa mais. */
    static final int TMDB_WEIGHT_CAP = 50;
    /** Antes disto o histograma não aparece (5 notas não desenham uma distribuição). */
    static final int MIN_HISTOGRAM = 5;

    private final DiaryModulePort diary;
    private final CatalogModulePort catalog;
    private final FollowRepositoryPort follows;
    private final UsersModulePort users;
    private final EntryInteractionsPort interactions;

    @Transactional(readOnly = true)
    public TitleCommunity summary(long titleId, UUID viewerId)
    {
        Set<UUID> following = new HashSet<>(follows.followingIds(viewerId, MAX_FOLLOWING));
        List<TitleCommunity.Review> all = visibleReviews(titleId, viewerId);

        List<TitleCommunity.Review> others = all.stream().filter(r -> !r.author().id().equals(viewerId)).toList();
        LinkedHashSet<TitleCommunity.Review> top = new LinkedHashSet<>();
        others.stream().filter(r -> following.contains(r.author().id())).limit(2).forEach(top::add);
        sorted(others, Sort.POPULAR).stream().filter(r -> top.size() < HIGHLIGHTS).forEach(top::add);

        List<TitleCommunity.Review> friends = friendsWhoWatched(titleId, viewerId, following);
        return new TitleCommunity(rating(titleId), friends, List.copyOf(top), all.size());
    }

    @Transactional(readOnly = true)
    public List<TitleCommunity.Review> reviews(long titleId, UUID viewerId, Sort sort, int page, int size)
    {
        List<TitleCommunity.Review> all = visibleReviews(titleId, viewerId);
        if (sort == Sort.FRIENDS) {
            Set<UUID> following = new HashSet<>(follows.followingIds(viewerId, MAX_FOLLOWING));
            all = all.stream().filter(r -> following.contains(r.author().id())).toList();
        }
        List<TitleCommunity.Review> ordered = sorted(all, sort);
        int from = Math.min(ordered.size(), Math.max(0, page) * size);
        return ordered.subList(from, Math.min(ordered.size(), from + size));
    }

    /**
     * Nota consolidada: média ponderada da nota do TMDB (convertida para 0,5–5) e da média do app.
     * O peso do TMDB é o número de votos dele, limitado a {@link #TMDB_WEIGHT_CAP}: com poucas notas no app,
     * a página não mostra "5,0" porque uma pessoa deu 5; com muitas, a comunidade daqui decide.
     */
    TitleCommunity.Rating rating(long titleId)
    {
        RatingsView app = diary.ratingsOf(titleId);
        Optional<TmdbRatingView> tmdb = catalog.tmdbRating(titleId).filter(t -> t.count() > 0);
        long n = app.count();
        if (n == 0 && tmdb.isEmpty()) {
            return null;
        }
        BigDecimal weighted = BigDecimal.ZERO;
        BigDecimal weights = BigDecimal.ZERO;
        if (n > 0) {
            weighted = weighted.add(app.average().multiply(BigDecimal.valueOf(n)));
            weights = weights.add(BigDecimal.valueOf(n));
        }
        if (tmdb.isPresent()) {
            BigDecimal w = BigDecimal.valueOf(Math.min(tmdb.get().count(), TMDB_WEIGHT_CAP));
            weighted = weighted.add(tmdb.get().average().divide(BigDecimal.TWO, 3, RoundingMode.HALF_UP).multiply(w));
            weights = weights.add(w);
        }
        BigDecimal average = weighted.divide(weights, 1, RoundingMode.HALF_UP).max(new BigDecimal("0.5")).min(new BigDecimal("5.0"));
        long count = n + tmdb.map(TmdbRatingView::count).orElse(0);

        List<Long> histogram = new ArrayList<>();
        if (n >= MIN_HISTOGRAM) {
            for (int i = 1; i <= 10; i++) {
                histogram.add(app.distribution().getOrDefault(BigDecimal.valueOf(i).divide(BigDecimal.TWO, 1, RoundingMode.UNNECESSARY), 0L));
            }
        }
        return new TitleCommunity.Rating(average, count, histogram);
    }

    private List<TitleCommunity.Review> friendsWhoWatched(long titleId, UUID viewerId, Set<UUID> following)
    {
        List<DiaryEntryView> entries = diary.latestEntriesOfTitle(titleId, following, viewerId);
        Map<UUID, UserView> byId = new HashMap<>();
        users.findByIds(entries.stream().map(DiaryEntryView::userId).toList()).forEach(u -> byId.put(u.id(), u));
        return entries.stream()
                .filter(e -> byId.containsKey(e.userId()))
                .limit(MAX_FRIENDS)
                .map(e -> new TitleCommunity.Review(e, byId.get(e.userId()), 0, 0))
                .toList();
    }

    /** Reviews que {@code viewerId} pode ver, mais recentes primeiro, com curtidas e respostas. */
    private List<TitleCommunity.Review> visibleReviews(long titleId, UUID viewerId)
    {
        List<DiaryEntryView> entries = diary.reviewsOfTitle(titleId, MAX_REVIEWS, viewerId);
        Map<UUID, UserView> authors = new HashMap<>();
        users.findByIds(entries.stream().map(DiaryEntryView::userId).distinct().toList()).forEach(u -> authors.put(u.id(), u));
        Map<UUID, Follow> mine = follows.findAllFrom(viewerId, authors.keySet());
        List<UUID> ids = entries.stream().map(DiaryEntryView::id).toList();
        Map<UUID, Long> likes = interactions.likeCounts(ids);
        Map<UUID, Long> replies = interactions.commentCounts(ids);

        List<TitleCommunity.Review> out = new ArrayList<>();
        for (DiaryEntryView e : entries) {
            UserView author = authors.get(e.userId());
            if (author == null) {
                continue; // conta excluída
            }
            Relationship rel = Relationship.of(author.id().equals(viewerId), Optional.ofNullable(mine.get(author.id())));
            if (FollowPolicy.canSeeContent(rel, author.isPrivate())) {
                out.add(new TitleCommunity.Review(e, author, likes.getOrDefault(e.id(), 0L), replies.getOrDefault(e.id(), 0L)));
            }
        }
        return out;
    }

    /** Populares: mais curtidas primeiro; empate (e quem ainda não tem curtida) pela mais recente. */
    private static List<TitleCommunity.Review> sorted(List<TitleCommunity.Review> reviews, Sort sort)
    {
        Comparator<TitleCommunity.Review> recent = Comparator.comparing((TitleCommunity.Review r) -> r.entry().createdAt()).reversed();
        Comparator<TitleCommunity.Review> order = sort == Sort.POPULAR
                ? Comparator.comparingLong(TitleCommunity.Review::likeCount).reversed().thenComparing(recent)
                : recent;
        return reviews.stream().sorted(order).toList();
    }
}
