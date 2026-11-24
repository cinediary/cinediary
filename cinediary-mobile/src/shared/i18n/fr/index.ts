import type { Strings } from '../pt';
import { account } from './account';
import { auth, onboarding } from './auth';
import { catalog } from './catalog';
import { common, tabs } from './common';
import { diary } from './diary';
import { importing } from './importing';
import { match } from './match';
import { social } from './social';
import { stats } from './stats';
import { lists } from './lists';

/**
 * Français (tutoiement, comme le ton du pt-BR) : mêmes fichiers et clés que ../pt. Typé `Strings`, donc s'il manque
 * un texte, le tsc échoue.
 */
export const fr: Strings = { tabs, common, auth, onboarding, catalog, diary, importing, stats, match, account, social, lists };
