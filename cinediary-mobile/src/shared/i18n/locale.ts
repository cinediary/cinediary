import { getLocales } from 'expo-localization';

import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { pt, type Strings } from './pt';

export type Language = 'pt' | 'en' | 'es' | 'fr';

const SUPPORTED: readonly Language[] = ['pt', 'en', 'es', 'fr'];

/** Português, espanhol ou francês do aparelho → esse idioma; qualquer outro → en. */
export function detectLanguage(): Language {
  const code = getLocales()[0]?.languageCode as Language | undefined;
  return code && SUPPORTED.includes(code) ? code : 'en';
}

/** País e idioma do aparelho (ex.: { region: 'US', language: 'en-US' }), para conteúdo local. */
export function deviceLocale(): { region: string | null; language: string | null } {
  const locale = getLocales()[0];
  return { region: locale?.regionCode ?? null, language: locale?.languageTag ?? null };
}

const dictionaries: Record<Language, Strings> = { pt, en, es, fr };

/**
 * Idioma lido na abertura do app. Mudar o idioma do sistema
 * reinicia o app no iOS e no Android, então não precisa ser reativo.
 */
export const language = detectLanguage();
export const strings: Strings = dictionaries[language];

/**
 * Locale BCP 47 para componentes nativos (ex.: o calendário) e para o backend (Accept-Language: títulos, sinopses e
 * gêneros do TMDB nesse idioma). O espanhol segue a região do aparelho: Espanha → es-ES; qualquer outra (América
 * Latina, EUA…) → es-MX, que é como o TMDB chama o espanhol da América Latina.
 */
export const nativeLocale: string = {
  pt: 'pt-BR',
  en: 'en-US',
  es: getLocales()[0]?.regionCode === 'ES' ? 'es-ES' : 'es-MX',
  fr: 'fr-FR',
}[language];
