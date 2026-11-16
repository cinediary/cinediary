import { strings } from '@/shared/i18n';
import type { EntryScope } from '../domain/diary';

/** "T2" ou "T2 · E5" (em inglês, "S2 · E5"). Fica na apresentação porque depende do idioma. */
export const scopeLabel = (scope: EntryScope) => strings.diary.scopeShort(scope.season, scope.episode);
