import { getLocales } from 'expo-localization';

import { en } from './en';
import { pt, type Strings } from './pt';

export type Language = 'pt' | 'en';

/** Português do aparelho → pt; qualquer outro idioma → en. */
export function detectLanguage(): Language {
  return getLocales()[0]?.languageCode === 'pt' ? 'pt' : 'en';
}

/** País e idioma do aparelho (ex.: { region: 'US', language: 'en-US' }), para conteúdo local. */
export function deviceLocale(): { region: string | null; language: string | null } {
  const locale = getLocales()[0];
  return { region: locale?.regionCode ?? null, language: locale?.languageTag ?? null };
}

const dictionaries: Record<Language, Strings> = { pt, en };

/**
 * Idioma lido na abertura do app. Mudar o idioma do sistema
 * reinicia o app no iOS e no Android, então não precisa ser reativo.
 */
export const language = detectLanguage();
export const strings: Strings = dictionaries[language];

/** Locale BCP 47 para componentes nativos (ex.: o calendário): "pt-BR" ou "en-US". */
export const nativeLocale = language === 'pt' ? 'pt-BR' : 'en-US';
