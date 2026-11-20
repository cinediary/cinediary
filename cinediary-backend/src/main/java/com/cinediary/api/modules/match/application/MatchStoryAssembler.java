package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.MatchStatus;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MatchStoryAssembler
{
    private final UsersModulePort users;
    private final CatalogModulePort catalog;
    private final MatchRepositoryPort matches;

    @Value("${cinediary.app.invite-base-url:cinediary://match/invite/}")
    private String inviteBaseUrl;

    public MatchSummary summary(TasteMatchModel m, UUID viewerId, int sharedWatchlistCount)
    {
        return new MatchSummary(m.id(), m.inviteCode(), inviteBaseUrl + m.inviteCode(), m.status().name(),
                m.status().label(), users.profile(m.creatorId(), viewerId),
                m.partnerId() == null ? null : users.profile(m.partnerId(), viewerId), m.compatibilityScore(),
                m.discoveryMode(), sharedWatchlistCount, m.createdAt());
    }

    public MatchStory story(TasteMatchModel m, UUID viewerId)
    {
        UserProfileView creator = users.profile(m.creatorId(), viewerId);
        UserProfileView partner = m.partnerId() == null ? null : users.profile(m.partnerId(), viewerId);
        MatchCalculationResult r = m.breakdown();
        boolean seen = matches.storySeen(m.id(), viewerId);
        if (r == null || m.status() == MatchStatus.PENDING) {
            return new MatchStory(m.id(), m.status().name(), m.status().label(), null, false, m.engineUsed().name(),
                    creator, partner, new MatchStory.ScoreBreakdown(0, 0.5, 0, 0.3, 0, 0.2, 0,
                    "Assim que seu amigo aceitar o convite, a gente calcula a compatibilidade de vocês."),
                    List.of(), List.of(), List.of(), List.of(), List.of(), slides(null, m), seen);
        }

        Set<Long> ids = new LinkedHashSet<>(r.bothLovedIds());
        r.disagreements().forEach(d -> ids.add(d.titleId()));
        r.discoveryPicks().forEach(p -> ids.add(p.titleId()));
        ids.addAll(r.jointRecommendationIds());
        Map<Long, TitleSummaryView> titles = new HashMap<>();
        catalog.summaries(new ArrayList<>(ids), viewerId).forEach(t -> titles.put(t.id(), t));

        Map<UUID, String> names = new HashMap<>();
        names.put(creator.id(), creator.displayName());
        if (partner != null) {
            names.put(partner.id(), partner.displayName());
        }

        return new MatchStory(m.id(), m.status().name(), m.status().label(), r.compatibilityScore(), r.discoveryMode(),
                r.engine().name(), creator, partner,
                new MatchStory.ScoreBreakdown(r.ratingsScore(), r.ratingsWeight(), r.genresScore(), r.genresWeight(),
                        r.favoritesScore(), r.favoritesWeight(), r.commonRatedCount(), explanation(r)),
                commonGenres(r),
                pick(titles, r.bothLovedIds()),
                r.disagreements().stream().filter(d -> titles.containsKey(d.titleId()))
                        .map(d -> new MatchStory.Disagreement(titles.get(d.titleId()),
                                BigDecimal.valueOf(d.creatorRating()), BigDecimal.valueOf(d.partnerRating())))
                        .toList(),
                r.discoveryPicks().stream().filter(p -> titles.containsKey(p.titleId()))
                        .map(p -> new MatchStory.DiscoveryPick(p.recommendedByUserId(),
                                names.getOrDefault(p.recommendedByUserId(), ""), titles.get(p.titleId())))
                        .toList(),
                pick(titles, r.jointRecommendationIds()),
                slides(r, m), seen);
    }

    static String explanation(MatchCalculationResult r)
    {
        if (r.building()) {
            return "Match em construção: um de vocês ainda não registrou nenhum filme ou gênero. "
                    + "Registrem alguns títulos para ver o resultado.";
        }
        if (r.discoveryMode()) {
            return String.format(Locale.ROOT,
                    "Vocês avaliaram %d título(s) em comum, então entramos no Modo Descoberta: "
                            + "65%% gêneros (%.1f) + 35%% favoritos (%.1f) = %d%%.",
                    r.commonRatedCount(), r.genresScore(), r.favoritesScore(), r.compatibilityScore());
        }
        return String.format(Locale.ROOT,
                "50%% notas em %d títulos em comum (%.1f) + 30%% gêneros (%.1f) + 20%% favoritos (%.1f) = %d%%.",
                r.commonRatedCount(), r.ratingsScore(), r.genresScore(), r.favoritesScore(), r.compatibilityScore());
    }

    /** Os 8 slides do Story aprovado: o app usa {@code available} para pular os vazios. */
    static List<MatchStory.Slide> slides(MatchCalculationResult r, TasteMatchModel m)
    {
        boolean calculated = r != null && !r.building();
        String scoreTitle = calculated ? r.compatibilityScore() + "% de compatibilidade" : m.status().label();
        return List.of(
                new MatchStory.Slide(1, "OPENING", "Vocês dois e o cinema", true),
                new MatchStory.Slide(2, "SCORE", scoreTitle, true),
                new MatchStory.Slide(3, "GENRES", "Gêneros em comum", calculated && !r.commonGenres().isEmpty()),
                new MatchStory.Slide(4, "BOTH_LOVED", "Os dois amam", calculated && !r.bothLovedIds().isEmpty()),
                new MatchStory.Slide(5, "DISAGREEMENTS", "Onde vocês discordam", calculated && !r.disagreements().isEmpty()),
                new MatchStory.Slide(6, "DISCOVERY", calculated && r.discoveryMode()
                        ? "Vocês têm muito a apresentar um ao outro" : "O que um ama e o outro ainda não viu",
                        calculated && !r.discoveryPicks().isEmpty()),
                new MatchStory.Slide(7, "RECOMMENDATIONS", "Para verem juntos",
                        calculated && !r.jointRecommendationIds().isEmpty()),
                new MatchStory.Slide(8, "SHARE", "Compartilhe o Match", true));
    }

    private static List<TitleSummaryView> pick(Map<Long, TitleSummaryView> titles, List<Long> ids)
    {
        return ids.stream().filter(titles::containsKey).map(titles::get).toList();
    }

    /**
     * Gêneros em comum no idioma de quem vê o Story (o resultado guarda os nomes do momento do cálculo, em PT-BR).
     * Sem ids (resultado antigo), ficam os nomes guardados.
     */
    private List<String> commonGenres(MatchCalculationResult r)
    {
        if (r.commonGenreIds() == null || r.commonGenreIds().isEmpty()) {
            return r.commonGenres();
        }
        Map<Integer, String> names = catalog.genreNames(r.commonGenreIds());
        return r.commonGenreIds().stream().map(names::get).filter(n -> n != null && !n.isBlank()).toList();
    }
}
