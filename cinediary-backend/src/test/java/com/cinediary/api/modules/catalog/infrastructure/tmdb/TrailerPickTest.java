package com.cinediary.api.modules.catalog.infrastructure.tmdb;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class TrailerPickTest
{
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static JsonNode videos(String json)
    {
        return JSON.readTree(json);
    }

    /** Caso real (Duna: Parte Dois): só existe trailer em português de Portugal, e o original em inglês. */
    private static final String DUNE = """
            [{"site":"YouTube","type":"Teaser","key":"imax","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"In IMAX One Week Only - Tickets On Sale Now"},
             {"site":"YouTube","type":"Trailer","key":"ptPT","iso_639_1":"pt","iso_3166_1":"PT","official":true,"name":"Dune: Parte Dois | Trailer | Max"},
             {"site":"YouTube","type":"Trailer","key":"enOfficial","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"Official Trailer 3"},
             {"site":"YouTube","type":"Teaser","key":"spot","iso_639_1":"es","iso_3166_1":"ES","official":true,"name":"Spot ''Rise''"}]""";

    @Test
    void brazilianDeviceGetsOriginalTrailerBeforePortugal()
    {
        assertThat(TmdbHttpClient.trailerKey(videos(DUNE), "pt", "BR", "en")).isEqualTo("enOfficial");
    }

    @Test
    void portugueseDeviceGetsTheTrailerFromPortugal()
    {
        assertThat(TmdbHttpClient.trailerKey(videos(DUNE), "pt", "PT", "en")).isEqualTo("ptPT");
    }

    @Test
    void brazilianTrailerWinsWhenItExists()
    {
        String withBr = DUNE.replace("]", ",{\"site\":\"YouTube\",\"type\":\"Trailer\",\"key\":\"ptBR\",\"iso_639_1\":\"pt\",\"iso_3166_1\":\"BR\",\"official\":false,\"name\":\"Trailer Dublado\"}]");
        assertThat(TmdbHttpClient.trailerKey(videos(withBr), "pt", "BR", "en")).isEqualTo("ptBR");
    }

    @Test
    void tvSpotsLoseToRealTeasersAndClipsAreIgnored()
    {
        String json = """
                [{"site":"YouTube","type":"Teaser","key":"tickets","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"Get tickets now"},
                 {"site":"YouTube","type":"Teaser","key":"teaser","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"Teaser"},
                 {"site":"YouTube","type":"Clip","key":"clip","iso_639_1":"pt","iso_3166_1":"BR","official":true,"name":"Cena"},
                 {"site":"Vimeo","type":"Trailer","key":"vimeo","iso_639_1":"pt","iso_3166_1":"BR","official":true,"name":"Trailer"}]""";
        assertThat(TmdbHttpClient.trailerKey(videos(json), "pt", "BR", "en")).isEqualTo("teaser");
    }
}
