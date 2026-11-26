import type { TitleSummary } from './title';

export type CrewJob = 'WRITER' | 'CINEMATOGRAPHY' | 'MUSIC' | 'CREATOR';

export interface Company {
  id: number;
  name: string;
  logoUrl: string | null;
}

/** Um serviço onde o título está (dados do JustWatch, via TMDB). */
export interface WatchProvider {
  id: number;
  name: string;
  logoUrl: string | null;
}

/** Onde assistir num país: assinatura, aluguel e compra (listas vazias quando não há). */
export interface WatchProviders {
  /** ISO 3166-1, ex.: "BR". */
  region: string;
  /** O país por extenso, ex.: "Brasil". */
  regionName: string;
  /** Página do TMDB com todas as opções nesse país. */
  link: string | null;
  stream: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface CrewMember {
  personId: number;
  name: string;
  job: CrewJob;
  photoUrl: string | null;
}

/** O que a página do título mostra além do básico. */
export interface TitleExtras {
  /** "AAAA-MM-DD": no Brasil quando houver; série: estreia. */
  releaseDate: string | null;
  originCountries: string[];
  companies: Company[];
  crew: CrewMember[];
  trailerYoutubeKey: string | null;
  collectionName: string | null;
  /** Outros filmes da franquia, em ordem de lançamento. */
  collection: TitleSummary[];
  similar: TitleSummary[];
  /** Onde assistir no país do aparelho; null quando não há dados. */
  watchProviders: WatchProviders | null;
}

/** Um backdrop do TMDB (cena sem texto): `path` é o que se salva; `url`, a imagem. */
export interface TitleBackdrop {
  path: string;
  url: string;
}

export interface CompanyDetail extends Company {
  originCountry: string | null;
  titles: TitleSummary[];
}

/** Episódio com os dados do TMDB (nome, data em que foi ao ar, duração, imagem e sinopse). */
export interface SeasonEpisode {
  number: number;
  name: string | null;
  /** "AAAA-MM-DD"; no futuro = ainda não foi ao ar. */
  airDate: string | null;
  runtimeMinutes: number | null;
  stillUrl: string | null;
  overview: string | null;
}
