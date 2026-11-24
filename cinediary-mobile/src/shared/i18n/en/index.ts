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

/** Inglês: mesmos arquivos e chaves do ../pt. Tipado como `Strings`, então faltar um texto é erro no tsc. */
export const en: Strings = { tabs, common, auth, onboarding, catalog, diary, importing, stats, match, account, social, lists };
