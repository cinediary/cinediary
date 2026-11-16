import { language, strings } from './locale';

const { months, monthsShort } = strings.common;
const isPt = language === 'pt';

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

/** "17 de out" · "Oct 17". */
export const formatShortDate = (date: Date) =>
  isPt ? `${date.getDate()} de ${monthsShort[date.getMonth()]}` : `${monthsShort[date.getMonth()]} ${date.getDate()}`;

/** Data curta com o ano: "17 de out de 2024" · "Oct 17, 2024". */
const withYear = (date: Date) =>
  isPt ? `${formatShortDate(date)} de ${date.getFullYear()}` : `${formatShortDate(date)}, ${date.getFullYear()}`;

/** "17 de out de 2024" · "Oct 17, 2024" (lançamento na página do título). */
export const formatFullDate = withYear;

/** PT-BR (UX-01 §8): 1.000 e 4,5. Inglês: 1,000 e 4.5. */
/** 950 · 12,3 mil · 1,2 mi (pt) / 950 · 12.3K · 1.2M (en). */
export const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${formatNumber(n / 1_000_000, n >= 10_000_000 ? 0 : 1)}${isPt ? ' mi' : 'M'}`;
  if (n >= 10_000) return `${formatNumber(n / 1_000, n >= 100_000 ? 0 : 1)}${isPt ? ' mil' : 'K'}`;
  return formatNumber(n);
};

export const formatNumber = (n: number, decimals = 0) => {
  const [int = '0', frac] = n.toFixed(decimals).split('.');
  const sep = isPt ? '.' : ',';
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return frac ? `${grouped}${isPt ? ',' : '.'}${frac}` : grouped;
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
