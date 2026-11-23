package com.cinediary.api.modules.catalog.presentation;

import com.cinediary.api.modules.catalog.application.GetCatalogTitleDetailUseCase;
import com.cinediary.api.modules.catalog.application.GetCompanyUseCase;
import com.cinediary.api.modules.catalog.application.GetGenresUseCase;
import com.cinediary.api.modules.catalog.application.GetPersonUseCase;
import com.cinediary.api.modules.catalog.application.GetSeasonUseCase;
import com.cinediary.api.modules.catalog.application.GetPopularTitlesUseCase;
import com.cinediary.api.modules.catalog.application.GetTitleCreditsUseCase;
import com.cinediary.api.modules.catalog.application.GetTitleExtrasUseCase;
import com.cinediary.api.modules.catalog.application.GetTrendingTitlesUseCase;
import com.cinediary.api.modules.catalog.application.SearchCatalogUseCase;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.presentation.dto.CatalogSearchResponse;
import com.cinediary.api.modules.catalog.presentation.dto.CatalogTitleDetailResponse;
import com.cinediary.api.modules.catalog.presentation.dto.CompanyResponse;
import com.cinediary.api.modules.catalog.presentation.dto.GenreDto;
import com.cinediary.api.modules.catalog.presentation.dto.PersonResponse;
import com.cinediary.api.modules.catalog.presentation.dto.SeasonResponse;
import com.cinediary.api.modules.catalog.presentation.dto.TrailerResponse;
import com.cinediary.api.modules.catalog.presentation.dto.TitleCreditDto;
import com.cinediary.api.modules.catalog.presentation.dto.TitleExtrasResponse;
import com.cinediary.api.shared.domain.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
@RequiredArgsConstructor
@Tag(name = "Catalog (TMDB)")
public class CatalogController
{
    private final SearchCatalogUseCase searchCatalog;
    private final GetPopularTitlesUseCase getPopularTitles;
    private final GetGenresUseCase getGenres;
    private final GetCatalogTitleDetailUseCase getTitleDetail;
    private final GetTitleCreditsUseCase getTitleCredits;
    private final GetPersonUseCase getPerson;
    private final GetTrendingTitlesUseCase getTrending;
    private final GetTitleExtrasUseCase getTitleExtras;
    private final GetCompanyUseCase getCompany;
    private final GetSeasonUseCase getSeason;

    @GetMapping("/search")
    @Operation(summary = "Busca filmes e séries no TMDB (pt-BR) com cache local no PostgreSQL")
    public CatalogSearchResponse search(CurrentUser user,
                                        @RequestParam String q,
                                        @RequestParam(defaultValue = "ALL") String type,
                                        @RequestParam(defaultValue = "1") int page)
    {
        return CatalogSearchResponse.from(searchCatalog.execute(q, type, page, user.id()));
    }

    @GetMapping("/popular")
    @Operation(summary = "Títulos populares no Brasil (onboarding e aba Registrar); com genreIds, só desses gêneros")
    public CatalogSearchResponse popular(CurrentUser user,
                                         @RequestParam(defaultValue = "MOVIE") String type,
                                         @RequestParam(defaultValue = "1") int page,
                                         @RequestParam(required = false) List<Integer> genreIds)
    {
        return CatalogSearchResponse.from(getPopularTitles.execute(type, page, user.id(), genreIds));
    }

    @GetMapping("/trending")
    @Operation(summary = "Em alta esta semana (TMDB trending, igual para todos)")
    public CatalogSearchResponse trending(CurrentUser user, @RequestParam(defaultValue = "MOVIE") String type)
    {
        return CatalogSearchResponse.from(getTrending.execute(type, user.id()));
    }

    @GetMapping("/genres")
    @Operation(summary = "Gêneros de filmes e séries em PT-BR (tela 1 do onboarding)")
    public List<GenreDto> genres()
    {
        return getGenres.execute().stream().map(g -> new GenreDto(g.id(), g.name())).toList();
    }

    @GetMapping("/{mediaType}/{tmdbId}")
    @Operation(summary = "Detalhes de um filme ou série (temporadas + estado do usuário)")
    public CatalogTitleDetailResponse detail(CurrentUser user,
                                             @PathVariable MediaType mediaType,
                                             @PathVariable long tmdbId)
    {
        return CatalogTitleDetailResponse.from(getTitleDetail.execute(mediaType, tmdbId, user.id()));
    }

    @GetMapping("/{mediaType}/{tmdbId}/credits")
    @Operation(summary = "Direção e elenco principal de um filme ou série")
    public List<TitleCreditDto> credits(@PathVariable MediaType mediaType, @PathVariable long tmdbId)
    {
        return getTitleCredits.execute(mediaType, tmdbId).stream().map(TitleCreditDto::from).toList();
    }

    @GetMapping("/people/{personId}")
    @Operation(summary = "Pessoa (TMDB) com os títulos em que atuou e os que dirigiu")
    public PersonResponse person(CurrentUser user, @PathVariable long personId)
    {
        return PersonResponse.from(getPerson.execute(personId, user.id()));
    }

    @GetMapping("/{mediaType}/{tmdbId}/extras")
    @Operation(summary = "Lançamento, país, produtoras, equipe, trailer, coleção, similares e onde assistir")
    public TitleExtrasResponse extras(CurrentUser user, @PathVariable MediaType mediaType, @PathVariable long tmdbId,
                                      @RequestParam(required = false) String language,
                                      @RequestParam(required = false) String region)
    {
        return TitleExtrasResponse.from(getTitleExtras.execute(mediaType, tmdbId, user.id(), language, region));
    }

    @GetMapping("/companies/{companyId}")
    @Operation(summary = "Produtora com os filmes dela, os mais populares primeiro")
    public CompanyResponse company(CurrentUser user, @PathVariable long companyId)
    {
        return CompanyResponse.from(getCompany.execute(companyId, user.id()));
    }

    @GetMapping("/series/{tmdbId}/seasons/{seasonNumber}")
    @Operation(summary = "Episódios de uma temporada: nome, data em que foi ao ar, duração, imagem e sinopse")
    public SeasonResponse season(@PathVariable long tmdbId, @PathVariable int seasonNumber)
    {
        return SeasonResponse.from(getSeason.season(tmdbId, seasonNumber));
    }

    @GetMapping("/series/{tmdbId}/seasons/{seasonNumber}/trailer")
    @Operation(summary = "Trailer da temporada no idioma do aparelho quando houver (youtubeKey null se não tiver)")
    public TrailerResponse seasonTrailer(@PathVariable long tmdbId, @PathVariable int seasonNumber,
                                         @RequestParam(required = false) String language)
    {
        return new TrailerResponse(getSeason.trailer(tmdbId, seasonNumber, language).orElse(null));
    }
}
