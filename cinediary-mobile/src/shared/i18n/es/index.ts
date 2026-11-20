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

/**
 * Español neutro (sirve para Latinoamérica y España): mismos archivos y claves de ../pt. Tipado como `Strings`,
 * así que si falta un texto, el tsc da error.
 */
export const es: Strings = { tabs, common, auth, onboarding, catalog, diary, importing, stats, match, account, social };
