package com.cinediary.api.modules.importing.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Um filme da exportação do Letterboxd, já consolidado entre os CSVs (watched, ratings, likes, watchlist,
 * diary, reviews). {@code entries}: cada vez que a pessoa registrou o filme no diário.
 * {@code favoriteRank}: posição (1 a 4) nos "Favorite Films" do perfil (profile.csv), ou null.
 */
public record LetterboxdParsedItem(String name, Integer year, boolean watched, BigDecimal rating, boolean liked,
                                   boolean inWatchlist, List<Entry> entries, Integer favoriteRank)
{
    public record Entry(LocalDate watchedDate, BigDecimal rating, boolean rewatch, String review)
    {
    }

    public String label()
    {
        return year == null ? name : name + " (" + year + ")";
    }

    /** O mesmo filme em CSVs diferentes (e nas listas): nome sem diferenciar maiúsculas + ano. */
    public static String key(String name, Integer year)
    {
        return (name == null ? "" : name.toLowerCase(java.util.Locale.ROOT)) + "|" + year;
    }

    public String key()
    {
        return key(name, year);
    }
}
