import type { TitleSummary } from './title';

/** Pessoa nos créditos de um título: personagem (elenco) ou "Direção". */
export interface Credit {
  personId: number;
  name: string;
  role: string | null;
  photoUrl: string | null;
  director: boolean;
}

/** Filmografia de uma pessoa (TMDB), já com o estado do usuário em cada título. */
export interface Person {
  id: number;
  name: string;
  photoUrl: string | null;
  knownForDepartment: string | null;
  acting: TitleSummary[];
  directing: TitleSummary[];
}

/** Quem é conhecido por dirigir vê "Dirigiu" primeiro; o resto, "Atuou em". */
export const directsFirst = (p: Pick<Person, 'knownForDepartment' | 'directing'>) =>
  p.knownForDepartment === 'Directing' && p.directing.length > 0;
