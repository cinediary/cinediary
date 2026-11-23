import type { TitleSummary } from '@/features/catalog/domain/title';
import type { Match, MatchStory, Person } from '../../domain/match';

/** Dados de exemplo para o Design System do Match (nada vem do servidor). */

const title = (id: number, name: string, year: number, genres: string[]): TitleSummary => ({
  id,
  tmdbId: id,
  mediaType: 'MOVIE',
  title: name,
  originalTitle: name,
  year,
  posterUrl: null,
  genres,
  state: { watched: false, rating: null, liked: false, inWatchlist: false, seriesStatus: null },
});

export const SAMPLE_ME: Person = { id: 'me', username: 'edu', name: 'Edu Dantas', avatarUrl: null };
const MARIA: Person = { id: 'maria', username: 'maria', name: 'Maria Lima', avatarUrl: null };

const titles = {
  aqui: title(1, 'Ainda Estou Aqui', 2024, ['Drama']),
  bacurau: title(2, 'Bacurau', 2019, ['Suspense', 'Faroeste']),
  central: title(3, 'Central do Brasil', 1998, ['Drama']),
  cidade: title(4, 'Cidade de Deus', 2002, ['Crime', 'Drama']),
  auto: title(5, 'O Auto da Compadecida', 2000, ['Comédia']),
  tropa: title(6, 'Tropa de Elite', 2007, ['Ação', 'Crime']),
  segunda: title(7, 'Que Horas Ela Volta?', 2015, ['Drama']),
  aquarius: title(8, 'Aquarius', 2016, ['Drama']),
};

export function sampleStory(discoveryMode: boolean, score = 78): MatchStory {
  return {
    matchId: 'sample',
    status: 'ACTIVE',
    statusLabel: 'Ativo',
    score,
    discoveryMode,
    engine: 'SQL_FALLBACK',
    creator: SAMPLE_ME,
    partner: MARIA,
    breakdown: {
      ratingsScore: discoveryMode ? 0 : 0.82,
      ratingsWeight: discoveryMode ? 0 : 0.5,
      genresScore: 0.74,
      genresWeight: discoveryMode ? 0.65 : 0.3,
      favoritesScore: 0.6,
      favoritesWeight: discoveryMode ? 0.35 : 0.2,
      commonRatedCount: discoveryMode ? 1 : 12,
      explanation: '',
    },
    commonGenres: ['Drama', 'Suspense', 'Comédia', 'Crime'],
    bothLoved: [titles.aqui, titles.central, titles.cidade],
    disagreements: [{ title: titles.tropa, creatorRating: 4.5, partnerRating: 1.5 }],
    discoveryPicks: [
      { recommendedByUserId: 'me', recommendedByName: 'Edu', title: titles.bacurau },
      { recommendedByUserId: 'me', recommendedByName: 'Edu', title: titles.auto },
      { recommendedByUserId: 'maria', recommendedByName: 'Maria', title: titles.segunda },
      { recommendedByUserId: 'maria', recommendedByName: 'Maria', title: titles.aquarius },
    ],
    jointRecommendations: [titles.segunda, titles.aquarius, titles.bacurau],
    seenByMe: true,
  };
}

export function sampleMatch(status: Match['status']): Match {
  return {
    id: `sample-${status}`,
    inviteCode: 'K7Q2',
    inviteUrl: 'https://cinediary.app/m/K7Q2',
    status,
    statusLabel: status,
    creator: SAMPLE_ME,
    partner: status === 'PENDING' ? null : MARIA,
    score: status === 'ACTIVE' ? 78 : null,
    discoveryMode: false,
    sharedWatchlistCount: status === 'ACTIVE' ? 6 : 0,
  };
}
