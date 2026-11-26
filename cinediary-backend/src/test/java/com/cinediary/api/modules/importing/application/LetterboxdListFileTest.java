package com.cinediary.api.modules.importing.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.cinediary.api.modules.importing.domain.LetterboxdList;
import org.junit.jupiter.api.Test;

/** Arquivos de lista da exportação do Letterboxd (#55): onde ficam no ZIP e como são lidos. */
class LetterboxdListFileTest
{
    @Test
    void listFilesAreFoundAtTheRootOrInsideTheExportFolder()
    {
        assertThat(LetterboxdZipParser.isListFile("lists/natal.csv")).isTrue();
        assertThat(LetterboxdZipParser.isListFile("letterboxd-ana-2026/lists/natal.csv")).isTrue();
        assertThat(LetterboxdZipParser.isListFile("letterboxd-ana-2026/deleted/lists/natal.csv")).isFalse();
        assertThat(LetterboxdZipParser.isListFile("lists/._natal.csv")).isFalse();
        assertThat(LetterboxdZipParser.isListFile("diary.csv")).isFalse();
    }

    @Test
    void aListHasItsInfoThenItsTitlesWithNotes()
    {
        LetterboxdList list = LetterboxdZipParser.parseList("""
                Letterboxd list export v7
                Date,Name,Tags,URL,Description
                2026-11-17,Os melhores do terror,,https://boxd.it/L,"Em ordem de susto.

                (Atualizada todo ano)"

                Position,Name,Year,URL,Description
                1,Halloween,1978,https://boxd.it/2wRu,"Clássico, sempre"
                2,Hocus Pocus,1993,https://boxd.it/1Wgi,
                3,Halloween,1978,https://boxd.it/2wRu,repetido
                """);
        assertThat(list.name()).isEqualTo("Os melhores do terror");
        assertThat(list.description()).isEqualTo("Em ordem de susto.\n\n(Atualizada todo ano)");
        // A exportação numera toda lista (com ou sem ranking no Letterboxd): entra sem ranking, na ordem.
        assertThat(list.ranked()).isFalse();
        assertThat(list.entries()).extracting(LetterboxdList.Entry::name).containsExactly("Halloween", "Hocus Pocus");
        assertThat(list.entries().getFirst().note()).isEqualTo("Clássico, sempre");
        assertThat(list.entries().getFirst().year()).isEqualTo(1978);
    }

    @Test
    void aListWithoutPositionsStillKeepsItsOrderAndOneWithoutNameIsIgnored()
    {
        LetterboxdList unranked = LetterboxdZipParser.parseList("""
                Letterboxd list export v7
                Date,Name,Tags,URL,Description
                2026-11-17,Sem ordem,,https://boxd.it/L,

                Position,Name,Year,URL,Description
                ,Duna,2021,https://boxd.it/d,
                """);
        assertThat(unranked.ranked()).isFalse();
        assertThat(unranked.description()).isNull();
        assertThat(LetterboxdZipParser.parseList("Letterboxd list export v7\nDate,Name,Tags,URL,Description\n2026-11-17,,,,\n")).isNull();
    }
}
