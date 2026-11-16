import type { Widen } from '../types';
import { account } from './account';
import { auth, onboarding } from './auth';
import { catalog } from './catalog';
import { common, tabs } from './common';
import { diary } from './diary';
import { importing } from './importing';
import { match } from './match';
import { social } from './social';
import { stats } from './stats';

/**
 * Fonte da verdade dos textos (PT-BR). Todo texto novo nasce aqui, no namespace da feature, e ganha
 * a tradução no mesmo arquivo de ../en (o tsc avisa se faltar).
 */
export const pt = { tabs, common, auth, onboarding, catalog, diary, importing, stats, match, account, social };

/** Formato de qualquer dicionário (pt, en): as mesmas chaves, com qualquer texto. */
export type Strings = Widen<typeof pt>;
