package com.cinediary.api.modules.importing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cinediary.api.modules.importing.domain.FavoritesMode;
import java.util.List;
import org.junit.jupiter.api.Test;

class FavoritesModeTest
{
    private static final List<Long> APP = List.of(1L, 2L, 3L);
    private static final List<Long> LETTERBOXD = List.of(3L, 9L, 8L, 7L);

    @Test
    void choiceOnlyMattersWhenBothSidesHaveFavorites()
    {
        for (FavoritesMode mode : FavoritesMode.values()) {
            assertThat(mode.resolve(List.of(), LETTERBOXD)).containsExactly(3L, 9L, 8L, 7L);
            assertThat(mode.resolve(APP, List.of())).isNull(); // nada a importar: não mexe
        }
    }

    @Test
    void keepReplaceAndMerge()
    {
        assertThat(FavoritesMode.KEEP.resolve(APP, LETTERBOXD)).isNull();
        assertThat(FavoritesMode.REPLACE.resolve(APP, LETTERBOXD)).containsExactly(3L, 9L, 8L, 7L);
        // Os do app primeiro; o 3 não repete; só cabe mais um (máximo de 4)
        assertThat(FavoritesMode.MERGE.resolve(APP, LETTERBOXD)).containsExactly(1L, 2L, 3L, 9L);
    }
}
