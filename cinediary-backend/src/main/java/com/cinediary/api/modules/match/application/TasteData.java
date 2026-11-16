package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.match.domain.TasteProfile;
import com.cinediary.api.modules.match.domain.TitleFacts;
import java.util.List;
import java.util.Map;

/** Gosto de um usuário já pronto para projetar no grafo ou para o cálculo relacional. */
public record TasteData(TasteProfile profile, List<TitleView> titles, Map<Integer, String> preferredGenres,
                        Map<Long, InteractionFlags> flags)
{
    public record InteractionFlags(boolean liked, boolean favorite, boolean watched, boolean signalOnly)
    {
    }

    public Map<Long, TitleFacts> titleFacts()
    {
        return TasteDataLoader.facts(titles);
    }
}
