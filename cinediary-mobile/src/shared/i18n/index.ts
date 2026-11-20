/**
 * Textos do app. Os dicionários ficam em ./pt, ./en, ./es e ./fr, com os MESMOS arquivos e chaves
 * (common, auth, catalog, diary, importing, match, stats). O PT-BR é a fonte da verdade do formato;
 * os outros são tipados por ele, então faltar uma tradução é erro no tsc.
 */
export { detectLanguage, deviceLocale, language, nativeLocale, strings, type Language } from './locale';
export type { Strings } from './pt';
export { title, type TitleParts } from './titleParts';
export * from './format';
