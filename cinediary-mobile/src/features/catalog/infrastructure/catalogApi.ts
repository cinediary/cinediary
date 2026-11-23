import { api, unwrap } from '@/shared/api/client';
import type { components } from '@/shared/api/schema';
import type { CompanyDetail, SeasonEpisode, TitleExtras, WatchProvider } from '../domain/extras';
import type { Credit, Person } from '../domain/person';
import type { ShowcasePoster } from '../domain/showcase';
import type { Genre, MediaType, SearchFilter, SearchPage, TitleDetail } from '../domain/title';
import { toTitleDetail, toTitleSummary } from './titleMapper';

function toWatchProvider(p: components['schemas']['WatchProvider']): WatchProvider {
  return { id: p.id, name: p.name, logoUrl: p.logoUrl ?? null };
}

/** Gateway HTTP do módulo catalog (TMDB centralizado no backend, pt-BR). */
export const catalogApi = {
  async search(query: string, type: SearchFilter, page = 1): Promise<SearchPage> {
    const dto = await unwrap(api.GET('/api/v1/catalog/search', { params: { query: { q: query, type, page } } }));
    return {
      page: dto.page,
      totalResults: dto.totalResults,
      fromCache: dto.source === 'CACHE',
      items: dto.items.map(toTitleSummary),
    };
  },

  /** Com `genreIds`, só os populares desses gêneros (onboarding: "quais destes você já viu?"). */
  async popular(type: SearchFilter = 'MOVIE', page = 1, genreIds: number[] = []): Promise<SearchPage> {
    const query = genreIds.length > 0 ? { type, page, genreIds } : { type, page };
    const dto = await unwrap(api.GET('/api/v1/catalog/popular', { params: { query } }));
    return {
      page: dto.page,
      totalResults: dto.totalResults,
      fromCache: dto.source === 'CACHE',
      items: dto.items.map(toTitleSummary),
    };
  },

  /** Vitrine pública (sem login): populares no país e no idioma pedidos. */
  async showcase(region: string | null, language: string | null): Promise<ShowcasePoster[]> {
    const query = { ...(region ? { region } : {}), ...(language ? { language } : {}) };
    const dto = await unwrap(api.GET('/api/v1/public/showcase', { params: { query } }));
    return dto.map((p) => ({ tmdbId: p.tmdbId, title: p.title, posterUrl: p.posterUrl }));
  },

  /** Em alta esta semana (TMDB trending), igual para todo mundo. */
  async trending(type: MediaType = 'MOVIE'): Promise<SearchPage> {
    const dto = await unwrap(api.GET('/api/v1/catalog/trending', { params: { query: { type } } }));
    return {
      page: dto.page,
      totalResults: dto.totalResults,
      fromCache: dto.source === 'CACHE',
      items: dto.items.map(toTitleSummary),
    };
  },

  async genres(): Promise<Genre[]> {
    const dto = await unwrap(api.GET('/api/v1/catalog/genres'));
    return dto.map((g) => ({ id: g.id, name: g.name }));
  },

  async detail(mediaType: MediaType, tmdbId: number): Promise<TitleDetail> {
    const dto = await unwrap(api.GET('/api/v1/catalog/{mediaType}/{tmdbId}', { params: { path: { mediaType, tmdbId } } }));
    return toTitleDetail(dto);
  },

  async credits(mediaType: MediaType, tmdbId: number): Promise<Credit[]> {
    const dto = await unwrap(api.GET('/api/v1/catalog/{mediaType}/{tmdbId}/credits', { params: { path: { mediaType, tmdbId } } }));
    return dto.map((c) => ({
      personId: c.personId,
      name: c.name,
      role: c.role ?? null,
      photoUrl: c.photoUrl ?? null,
      director: c.director,
    }));
  },

  /**
   * `language`: idioma do aparelho (ex.: pt-BR), para o trailer vir nele quando houver.
   * `region`: país do aparelho (ex.: BR), para os streamings.
   */
  async extras(mediaType: MediaType, tmdbId: number, language: string | null, region: string | null): Promise<TitleExtras> {
    const dto = await unwrap(
      api.GET('/api/v1/catalog/{mediaType}/{tmdbId}/extras', {
        params: {
          path: { mediaType, tmdbId },
          query: { ...(language ? { language } : {}), ...(region ? { region } : {}) },
        },
      }),
    );
    return {
      releaseDate: dto.releaseDate ?? null,
      originCountries: dto.originCountries,
      companies: dto.companies.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logoUrl ?? null })),
      crew: dto.crew.map((c) => ({ personId: c.personId, name: c.name, job: c.job, photoUrl: c.photoUrl ?? null })),
      trailerYoutubeKey: dto.trailerYoutubeKey ?? null,
      collectionName: dto.collectionName ?? null,
      collection: dto.collection.map(toTitleSummary),
      similar: dto.similar.map(toTitleSummary),
      watchProviders: dto.watchProviders
        ? {
            region: dto.watchProviders.region,
            regionName: dto.watchProviders.regionName,
            link: dto.watchProviders.link ?? null,
            stream: dto.watchProviders.stream.map(toWatchProvider),
            rent: dto.watchProviders.rent.map(toWatchProvider),
            buy: dto.watchProviders.buy.map(toWatchProvider),
          }
        : null,
    };
  },

  async seasonEpisodes(tmdbId: number, seasonNumber: number): Promise<SeasonEpisode[]> {
    const dto = await unwrap(
      api.GET('/api/v1/catalog/series/{tmdbId}/seasons/{seasonNumber}', { params: { path: { tmdbId, seasonNumber } } }),
    );
    return dto.episodes.map((e) => ({
      number: e.number,
      name: e.name ?? null,
      airDate: e.airDate ?? null,
      runtimeMinutes: e.runtimeMinutes ?? null,
      stillUrl: e.stillUrl ?? null,
      overview: e.overview ?? null,
    }));
  },

  async seasonTrailer(tmdbId: number, seasonNumber: number, language: string | null): Promise<string | null> {
    const dto = await unwrap(
      api.GET('/api/v1/catalog/series/{tmdbId}/seasons/{seasonNumber}/trailer', {
        params: { path: { tmdbId, seasonNumber }, query: language ? { language } : {} },
      }),
    );
    return dto.youtubeKey ?? null;
  },

  async company(companyId: number): Promise<CompanyDetail> {
    const dto = await unwrap(api.GET('/api/v1/catalog/companies/{companyId}', { params: { path: { companyId } } }));
    return {
      id: dto.id,
      name: dto.name,
      logoUrl: dto.logoUrl ?? null,
      originCountry: dto.originCountry ?? null,
      titles: dto.titles.map(toTitleSummary),
    };
  },

  async person(personId: number): Promise<Person> {
    const dto = await unwrap(api.GET('/api/v1/catalog/people/{personId}', { params: { path: { personId } } }));
    return {
      id: dto.id,
      name: dto.name,
      photoUrl: dto.photoUrl ?? null,
      knownForDepartment: dto.knownForDepartment ?? null,
      acting: dto.acting.map(toTitleSummary),
      directing: dto.directing.map(toTitleSummary),
    };
  },
};
