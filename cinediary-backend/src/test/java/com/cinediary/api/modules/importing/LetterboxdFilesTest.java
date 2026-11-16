package com.cinediary.api.modules.importing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cinediary.api.modules.importing.domain.LetterboxdFilmRef;
import org.junit.jupiter.api.Test;

class LetterboxdFilesTest
{
    @Test
    void filmPageUrlGivesNameAndOptionalYear()
    {
        assertThat(LetterboxdFilmRef.fromFilmUrl("https://letterboxd.com/film/the-polar-express/"))
                .contains(new LetterboxdFilmRef("the polar express", null));
        assertThat(LetterboxdFilmRef.fromFilmUrl("https://letterboxd.com/film/sweeney-todd-the-demon-barber-of-fleet-street-2007/"))
                .contains(new LetterboxdFilmRef("sweeney todd the demon barber of fleet street", 2007));
        // Número no começo é parte do título, não ano
        assertThat(LetterboxdFilmRef.fromFilmUrl("https://letterboxd.com/film/2001-a-space-odyssey/"))
                .contains(new LetterboxdFilmRef("2001 a space odyssey", null));
    }

    @Test
    void anythingButAFilmPageIsRefused()
    {
        assertThat(LetterboxdFilmRef.fromFilmUrl("https://evil.example/film/x/")).isEmpty();
        assertThat(LetterboxdFilmRef.fromFilmUrl("https://letterboxd.com/edudanntas/")).isEmpty();
        assertThat(LetterboxdFilmRef.fromFilmUrl(null)).isEmpty();
    }
}
