/** [antes, palavra emocional em itálico, depois] — regra do itálico da UX-01. */
export type TitleParts = readonly [string, string, string?];

export const title = (before: string, emphasis: string, after = ''): TitleParts => [before, emphasis, after];
