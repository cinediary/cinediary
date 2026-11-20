import { language, nativeLocale, strings } from './locale';

const { months, monthsShort } = strings.common;

/** Separadores de número de cada locale (o espanhol muda entre a Espanha e a América Latina). */
const separators: Record<string, { group: string; decimal: string }> = {
  'pt-BR': { group: '.', decimal: ',' },
  'en-US': { group: ',', decimal: '.' },
  'es-ES': { group: '.', decimal: ',' },
  'es-MX': { group: ',', decimal: '.' },
  // Francês: espaço fino inseparável entre os milhares (1 000).
  'fr-FR': { group: '\u202f', decimal: ',' },
};
const { group, decimal } = separators[nativeLocale] ?? { group: ',', decimal: '.' };

/** "mil" e "milhão" curtos de cada idioma: 12,3 mil · 12.3K · 12,3 k. */
const compactSuffix: Record<typeof language, { thousand: string; million: string }> = {
  pt: { thousand: ' mil', million: ' mi' },
  en: { thousand: 'K', million: 'M' },
  es: { thousand: ' mil', million: ' M' },
  fr: { thousand: ' k', million: ' M' },
};

/** "2026-11-13" → Date local (sem fuso). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Date → "2026-11-13" (data local). */
export function toIsoDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export const formatMonthYear = (date: Date) => `${months[date.getMonth()]} ${date.getFullYear()}`;

/** "2026-11" → "nov". */
export const formatYearMonthShort = (yearMonth: string) => monthsShort[Number(yearMonth.slice(5, 7)) - 1] ?? yearMonth;

/** "17 de out" · "Oct 17" · "17 oct" · "17 oct.". */
export const formatShortDate = (date: Date) => {
  const day = date.getDate();
  const month = monthsShort[date.getMonth()];
  if (language === 'pt') return `${day} de ${month}`;
  if (language === 'en') return `${month} ${day}`;
  return `${day} ${month}`;
};

/** Data curta com o ano: "17 de out de 2024" · "Oct 17, 2024" · "17 oct 2024" · "17 oct. 2024". */
const withYear = (date: Date) => {
  const year = date.getFullYear();
  if (language === 'pt') return `${formatShortDate(date)} de ${year}`;
  if (language === 'en') return `${formatShortDate(date)}, ${year}`;
  return `${formatShortDate(date)} ${year}`;
};

/** "17 de out de 2024" · "Oct 17, 2024" (lançamento na página do título). */
export const formatFullDate = withYear;

/** 950 · 12,3 mil · 1,2 mi (pt) / 950 · 12.3K · 1.2M (en) / 12,3 mil · 1,2 M (es) / 12,3 k · 1,2 M (fr). */
export const formatCompact = (n: number) => {
  const suffix = compactSuffix[language];
  if (n >= 1_000_000) return `${formatNumber(n / 1_000_000, n >= 10_000_000 ? 0 : 1)}${suffix.million}`;
  if (n >= 10_000) return `${formatNumber(n / 1_000, n >= 100_000 ? 0 : 1)}${suffix.thousand}`;
  return formatNumber(n);
};

/** PT-BR (UX-01 §8): 1.000 e 4,5. Inglês: 1,000 e 4.5. Os outros seguem a tabela `separators`. */
export const formatNumber = (n: number, decimals = 0) => {
  const [int = '0', frac] = n.toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return frac ? `${grouped}${decimal}${frac}` : grouped;
};

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function relativeDayLabel(date: Date, today = new Date()): string {
  if (isSameDay(date, today)) return strings.common.today;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (isSameDay(date, y)) return strings.common.yesterday;
  // Em outro ano, o ano aparece (ex.: filme do onboarding registrado como visto em 2019).
  return date.getFullYear() === today.getFullYear() ? formatShortDate(date) : withYear(date);
}

/** Há quanto tempo (respostas): "agora", "5 min", "3 h", "2 d"; depois de uma semana, a data curta. */
export function timeAgo(iso: string, now = new Date()): string {
  const c = strings.common;
  const date = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return c.justNow;
  if (minutes < 60) return c.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return c.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return c.daysAgo(days);
  return date.getFullYear() === now.getFullYear() ? formatShortDate(date) : withYear(date);
}
