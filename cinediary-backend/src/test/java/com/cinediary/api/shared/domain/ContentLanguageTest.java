package com.cinediary.api.shared.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ContentLanguageTest
{
    @Test
    void readsTheDeviceLanguageAndRegion()
    {
        assertThat(ContentLanguage.fromHeader("pt-BR")).isEqualTo(ContentLanguage.PT);
        assertThat(ContentLanguage.fromHeader("en-US,en;q=0.9")).isEqualTo(ContentLanguage.EN);
        assertThat(ContentLanguage.fromHeader("es-ES")).isEqualTo(ContentLanguage.ES);
        // Espanhol fora da Espanha (ou sem região): América Latina
        assertThat(ContentLanguage.fromHeader("es-MX")).isEqualTo(ContentLanguage.ES_419);
        assertThat(ContentLanguage.fromHeader("es-AR,es;q=0.9")).isEqualTo(ContentLanguage.ES_419);
        assertThat(ContentLanguage.fromHeader("es")).isEqualTo(ContentLanguage.ES_419);
        assertThat(ContentLanguage.fromHeader("fr-FR")).isEqualTo(ContentLanguage.FR);
        assertThat(ContentLanguage.fromHeader("fr-CA")).isEqualTo(ContentLanguage.FR);
        // Outro idioma ou sem cabeçalho: português, o idioma base do catálogo
        assertThat(ContentLanguage.fromHeader("de-DE")).isEqualTo(ContentLanguage.PT);
        assertThat(ContentLanguage.fromHeader(null)).isEqualTo(ContentLanguage.PT);
        assertThat(ContentLanguage.fromHeader(" ")).isEqualTo(ContentLanguage.PT);
    }

    @Test
    void codesStayDistinctAndFitTheTranslationsTable()
    {
        assertThat(ContentLanguage.ES.code()).isEqualTo("es");
        assertThat(ContentLanguage.ES_419.code()).isEqualTo("es-MX");
        assertThat(ContentLanguage.EN.code()).isEqualTo("en");
        for (ContentLanguage l : ContentLanguage.values()) {
            assertThat(l.code()).hasSizeLessThanOrEqualTo(8);
        }
        assertThat(ContentLanguage.values()).extracting(ContentLanguage::code).doesNotHaveDuplicates();
    }
}
