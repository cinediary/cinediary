import type { TitleSummary } from '@/features/catalog/domain/title';
import type { ListDetail, ListOwner } from '../../domain/list';

/** Listas de exemplo para o Design System (#17): nada vem do servidor. */

const poster = (path: string) => `https://image.tmdb.org/t/p/w342${path}`;
const t = (id: number, title: string, year: number, path: string): TitleSummary => ({
  id,
  tmdbId: id,
  mediaType: 'MOVIE',
  title,
  originalTitle: title,
  year,
  posterUrl: poster(path),
  genres: [],
  state: { watched: true, rating: null, liked: false, inWatchlist: false, seriesStatus: null },
});

const T = {
  hereditary: t(493922, 'Hereditário', 2018, '/x9tUYQj6WrdVwoKimSdoMzkDABS.jpg'),
  getOut: t(419430, 'Corra!', 2017, '/A0RoSZh8PEYJgDMgM2EV7Ycz3dR.jpg'),
  interstellar: t(157336, 'Interestelar', 2014, '/tR1XVa5bxgdh2bRw2u0DzrgkO2l.jpg'),
  batman: t(155, 'Batman: O Cavaleiro das Trevas', 2008, '/dutnVGV9ljCZh84bkTE1TVZ4s4Y.jpg'),
  inception: t(27205, 'A Origem', 2010, '/9e3Dz7aCANy5aRUQF745IlNloJ1.jpg'),
  matrix: t(603, 'Matrix', 1999, '/lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg'),
  dune: t(438631, 'Duna', 2021, '/uzERcfV2rSHNhW5eViQiO9hNiA7.jpg'),
  bladeRunner: t(335984, 'Blade Runner 2049', 2017, '/49pANIZXRAdHUiWjjBv4vxPeqRC.jpg'),
  whiplash: t(244786, 'Whiplash', 2014, '/2msJb27jMeuA101ox4MuTQK4mDa.jpg'),
  pulp: t(680, 'Pulp Fiction', 1994, '/tptjnB2LDbuUWya9Cx5sQtv5hqb.jpg'),
  barbie: t(346698, 'Barbie', 2023, '/pP12F7Gutn6CpHYaIPBlDRHlMlk.jpg'),
  budapest: t(120467, 'O Grande Hotel Budapeste', 2014, '/yabOguSrb8ffUXCkI6t8Rw7xtSh.jpg'),
  laLaLand: t(313369, 'La La Land', 2016, '/AvMietG6xuobpSSdmVnKuTjv4bL.jpg'),
  madMax: t(76341, 'Mad Max: Estrada da Fúria', 2015, '/tH64gzAHDFg7EFcgfkkZyHdGM5P.jpg'),
};

const ME: ListOwner = { id: 'me', username: 'edu', name: 'Edu Dantas', avatarUrl: null };

const list = (
  id: string,
  name: string,
  description: string | null,
  ranked: boolean,
  titles: TitleSummary[],
  notes: Record<number, string> = {},
  likes = 0,
): ListDetail => ({
  id,
  owner: ME,
  name,
  description,
  ranked,
  visibility: 'PUBLIC',
  itemsCount: titles.length,
  likesCount: likes,
  likedByMe: false,
  coverPosters: titles.slice(0, 5).map((x) => x.posterUrl),
  updatedAt: '2026-11-20T20:00:00Z',
  items: titles.map((title, i) => ({ position: i + 1, title, note: notes[i + 1] ?? null })),
});

export const SAMPLE_LISTS: ListDetail[] = [
  list(
    'terror',
    'Os melhores do terror',
    'Os que me fizeram dormir de luz acesa. Em ordem de quanto me assustaram.',
    true,
    [T.hereditary, T.getOut, T.batman, T.matrix],
    { 1: 'A cena do carro. Nunca mais.', 2: 'Cada detalhe muda na segunda vez.' },
    12,
  ),
  list(
    'scifi',
    'Ficção científica para rever',
    null,
    false,
    [T.interstellar, T.dune, T.bladeRunner, T.inception, T.matrix, T.madMax],
    {},
    4,
  ),
  list(
    'natal',
    'Para ver no Natal',
    'Os de sempre, com a família toda no sofá.',
    false,
    [T.budapest, T.laLaLand, T.barbie],
    {},
    0,
  ),
  list(
    'musica',
    'Filmes com trilha que eu ouço até hoje',
    null,
    true,
    [T.whiplash, T.laLaLand, T.pulp],
    { 1: 'Not quite my tempo.' },
    1,
  ),
];
