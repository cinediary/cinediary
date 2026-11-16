package com.cinediary.api.modules.importing.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LetterboxdKnownFilesTest
{
    @Test
    void onlyTheRealHistoryFilesAreRead()
    {
        assertThat(LetterboxdZipParser.knownName("diary.csv")).isEqualTo("diary.csv");
        assertThat(LetterboxdZipParser.knownName("letterboxd-edu-2026-11-14/diary.csv")).isEqualTo("diary.csv");
        assertThat(LetterboxdZipParser.knownName("likes/films.csv")).isEqualTo("likes/films.csv");
        assertThat(LetterboxdZipParser.knownName("letterboxd-edu-2026-11-14/likes/films.csv")).isEqualTo("likes/films.csv");
        // Apagados, órfãos e reviews de outras pessoas que você curtiu
        assertThat(LetterboxdZipParser.knownName("deleted/diary.csv")).isNull();
        assertThat(LetterboxdZipParser.knownName("orphaned/reviews.csv")).isNull();
        assertThat(LetterboxdZipParser.knownName("likes/reviews.csv")).isNull();
        assertThat(LetterboxdZipParser.knownName("letterboxd-edu/deleted/diary.csv")).isNull();
    }
}
