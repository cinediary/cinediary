package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.GenreView;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.GenrePreferenceView;
import com.cinediary.api.modules.diary.api.InteractionView;
import com.cinediary.api.modules.match.domain.TasteProfile;
import com.cinediary.api.modules.match.domain.TasteWeights;
import com.cinediary.api.modules.match.domain.TitleFacts;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Lê o gosto de um usuário pelas portas públicas de diary e catalog (nunca pelas tabelas deles). */
@Component
@RequiredArgsConstructor
public class TasteDataLoader
{
    private final DiaryModulePort diary;
    private final CatalogModulePort catalog;

    public TasteData load(UUID userId)
    {
        List<InteractionView> interactions = diary.interactionsOf(userId);
        Map<Long, TasteProfile.Interaction> byTitle = new LinkedHashMap<>();
        Map<Long, TasteData.InteractionFlags> flags = new HashMap<>();
        for (InteractionView i : interactions) {
            Double rating = i.rating() == null ? null : i.rating().doubleValue();
            double weight = TasteWeights.affinityWeight(rating, i.liked(), i.favorite(), i.watched(), i.signalOnly());
            byTitle.put(i.titleId(), new TasteProfile.Interaction(i.titleId(), rating, weight));
            flags.put(i.titleId(), new TasteData.InteractionFlags(i.liked(), i.favorite(), i.watched(), i.signalOnly()));
        }
        Map<Integer, String> preferred = new LinkedHashMap<>();
        for (GenrePreferenceView g : diary.genrePreferencesOf(userId)) {
            preferred.put(g.genreId(), g.genreName());
        }
        List<TitleView> titles = catalog.findTitles(byTitle.keySet());
        return new TasteData(new TasteProfile(userId, byTitle, Set.copyOf(preferred.keySet())), titles, preferred, flags);
    }

    public static Map<Long, TitleFacts> facts(Collection<TitleView> titles)
    {
        Map<Long, TitleFacts> out = new HashMap<>();
        for (TitleView t : titles) {
            out.put(t.id(), new TitleFacts(t.id(), t.genres().stream().map(GenreView::id).collect(Collectors.toSet()),
                    t.popularity() == null ? 0.0 : t.popularity().doubleValue()));
        }
        return out;
    }
}
