import type { TitleSummary } from '@/features/catalog/domain/title';
import type { DiaryEntry } from '../../domain/diary';
import type { DiaryFilterOptions } from '../../domain/diaryFilters';

/** Diário de exemplo para o Design System dos filtros (#147): nada vem do servidor. */

const poster = (path: string) => `https://image.tmdb.org/t/p/w185${path}`;

const t = (
  id: number,
  mediaType: 'MOVIE' | 'SERIES',
  title: string,
  year: number,
  path: string,
  genres: string[],
): TitleSummary => ({
  id,
  tmdbId: id,
  mediaType,
  title,
  originalTitle: title,
  year,
  posterUrl: poster(path),
  genres,
  state: { watched: true, rating: null, liked: false, inWatchlist: false, seriesStatus: null },
});

const T = {
  interstellar: t(157336, 'MOVIE', 'Interestelar', 2014, '/tR1XVa5bxgdh2bRw2u0DzrgkO2l.jpg', [
    'Aventura',
    'Drama',
    'Ficção científica',
  ]),
  batman: t(155, 'MOVIE', 'Batman: O Cavaleiro das Trevas', 2008, '/dutnVGV9ljCZh84bkTE1TVZ4s4Y.jpg', [
    'Ação',
    'Thriller',
    'Crime',
  ]),
  inception: t(27205, 'MOVIE', 'A Origem', 2010, '/9e3Dz7aCANy5aRUQF745IlNloJ1.jpg', ['Ação', 'Ficção científica', 'Crime']),
  matrix: t(603, 'MOVIE', 'Matrix', 1999, '/lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg', ['Ação', 'Ficção científica']),
  dune: t(438631, 'MOVIE', 'Duna', 2021, '/uzERcfV2rSHNhW5eViQiO9hNiA7.jpg', ['Ficção científica', 'Aventura']),
  bladeRunner: t(335984, 'MOVIE', 'Blade Runner 2049', 2017, '/49pANIZXRAdHUiWjjBv4vxPeqRC.jpg', ['Ficção científica', 'Drama']),
  whiplash: t(244786, 'MOVIE', 'Whiplash: Em Busca da Perfeição', 2014, '/2msJb27jMeuA101ox4MuTQK4mDa.jpg', ['Drama', 'Música']),
  pulp: t(680, 'MOVIE', 'Pulp Fiction: Tempo de Violência', 1994, '/tptjnB2LDbuUWya9Cx5sQtv5hqb.jpg', [
    'Thriller',
    'Crime',
    'Comédia',
  ]),
  madMax: t(76341, 'MOVIE', 'Mad Max: Estrada da Fúria', 2015, '/tH64gzAHDFg7EFcgfkkZyHdGM5P.jpg', ['Ação', 'Aventura']),
  barbie: t(346698, 'MOVIE', 'Barbie', 2023, '/pP12F7Gutn6CpHYaIPBlDRHlMlk.jpg', ['Comédia', 'Aventura', 'Fantasia']),
  budapest: t(120467, 'MOVIE', 'O Grande Hotel Budapeste', 2014, '/yabOguSrb8ffUXCkI6t8Rw7xtSh.jpg', ['Comédia', 'Drama']),
  laLaLand: t(313369, 'MOVIE', 'La La Land: Cantando Estações', 2016, '/AvMietG6xuobpSSdmVnKuTjv4bL.jpg', [
    'Comédia',
    'Drama',
    'Romance',
  ]),
  getOut: t(419430, 'MOVIE', 'Corra!', 2017, '/A0RoSZh8PEYJgDMgM2EV7Ycz3dR.jpg', ['Mistério', 'Thriller', 'Terror']),
  hereditary: t(493922, 'MOVIE', 'Hereditário', 2018, '/x9tUYQj6WrdVwoKimSdoMzkDABS.jpg', ['Terror', 'Mistério']),
  succession: t(76331, 'SERIES', 'Succession', 2018, '/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg', ['Drama', 'Comédia']),
};

let n = 0;
const e = (title: TitleSummary, date: string, rating: number | null, extra: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: `sample-${++n}`,
  authorId: 'me',
  title,
  watchedDate: date,
  rating,
  liked: false,
  isRewatch: false,
  reviewText: null,
  createdAt: `${date}T20:00:00Z`,
  scope: null,
  containsSpoilers: false,
  replyPolicy: null,
  tags: [],
  ...extra,
});

export const SAMPLE_DIARY: DiaryEntry[] = [
  e(T.hereditary, '2026-11-20', 4.5, { reviewText: 'Saí do cinema sem conseguir dormir. A cena do carro é inesquecível.' }),
  e(T.succession, '2026-11-12', 5, { liked: true }),
  e(T.barbie, '2026-10-28', 4, { isRewatch: true }),
  e(T.getOut, '2026-10-03', 4.5, {
    liked: true,
    reviewText: 'Cada detalhe ganha outro sentido na segunda vez.',
    isRewatch: true,
  }),
  e(T.dune, '2026-09-14', 4),
  e(T.whiplash, '2026-08-02', 5, { liked: true, reviewText: 'Not quite my tempo.' }),
  e(T.laLaLand, '2026-07-19', 3.5),
  e(T.interstellar, '2025-12-24', 5, { liked: true, isRewatch: true }),
  e(T.budapest, '2025-12-01', 4),
  e(T.bladeRunner, '2025-10-11', 4.5, { reviewText: 'A fotografia do Deakins sozinha já vale o filme.' }),
  e(T.madMax, '2025-08-30', 4),
  e(T.pulp, '2025-06-07', 3.5, { isRewatch: true }),
  e(T.matrix, '2025-03-15', 4.5, { liked: true }),
  e(T.inception, '2024-11-09', 4, { reviewText: 'O pião caiu. Eu tenho certeza.' }),
  e(T.batman, '2024-07-21', 5, { liked: true }),
  e(T.interstellar, '2024-02-02', 4.5),
];

/** As opções dos filtros do diário de exemplo (no app, vêm do servidor). */
const genreNames = [...new Set(SAMPLE_DIARY.flatMap((x) => x.title.genres))];
export const SAMPLE_OPTIONS: DiaryFilterOptions = {
  years: [...new Set(SAMPLE_DIARY.map((x) => Number(x.watchedDate!.slice(0, 4))))].sort((a, b) => b - a),
  genres: genreNames
    .map((name, i) => ({ id: i + 1, name, entries: SAMPLE_DIARY.filter((x) => x.title.genres.includes(name)).length }))
    .sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name, 'pt')),
  movies: SAMPLE_DIARY.filter((x) => x.title.mediaType === 'MOVIE').length,
  series: SAMPLE_DIARY.filter((x) => x.title.mediaType === 'SERIES').length,
};
