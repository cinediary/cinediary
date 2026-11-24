/**
 * CineDiary — Design Tokens (UX-01 · "Diário de Papel")
 * Fonte da verdade: docs/design/UX-01-Design-System.md
 * Destino sugerido: cinediary-mobile/src/theme/tokens.ts
 */

export const palette = {
  bg: '#FAF6F0',
  surface: '#FFFDF9',
  surfaceSunken: '#F3ECE2',
  border: '#E6DCCF',
  borderStrong: '#CBBFB1',

  ink900: '#2A211C',
  ink700: '#4F433B',
  ink500: '#76695F', // menor tom permitido para texto (4.93:1 no bg)
  ink400: '#8E8176', // somente ícones/estrela vazia

  terracota100: '#F6E1D7',
  terracota300: '#E9B8A3',
  terracota500: '#C2694B', // decorativo
  terracota600: '#A9553A', // botão primário (texto surface 5.11:1)
  terracota700: '#8C432C', // texto/link

  pipoca100: '#FBF0D4',
  pipoca300: '#F2D58A',
  pipoca500: '#D9A23A', // preenchimento da estrela
  pipoca600: '#A9761A', // contorno da estrela (3.68:1)
  pipoca700: '#7D5A12',

  salvia100: '#E3EBDD',
  salvia300: '#C5D3BC',
  salvia500: '#8FA685',
  salvia700: '#4A6243',

  rosa100: '#F7E4E1',
  rosa300: '#EDC7C1',
  rosa500: '#D08C86',
  rosa700: '#8C4B47',

  error: '#A23B2E',
} as const;

/** Paleta "Festa" — exclusiva do Match Story (UX-05). */
export const party = {
  tomato: '#B4532F',
  butter: '#F4C84B',
  plum: '#5B2A44',
  sage: '#A9C49A',
  blush: '#F2A8A0',
  ink: '#2A211C',
  cream: '#FFF4E6',
} as const;

export const semantic = {
  background: palette.bg,
  card: palette.surface,
  textPrimary: palette.ink900,
  /** Contorno fino por cima de uma foto (ink900 a 12%): marca a borda sem esconder a imagem. */
  imageOutline: 'rgba(42,33,28,0.12)',
  textSecondary: palette.ink700,
  textMuted: palette.ink500,
  iconInactive: palette.ink400,
  primary: palette.terracota600,
  onPrimary: palette.surface,
  link: palette.terracota700,
  watched: palette.salvia700,
  progress: palette.salvia500,
  liked: palette.rosa500,
  starFill: palette.pipoca500,
  starStroke: palette.pipoca600,
  success: palette.salvia700,
  warning: palette.pipoca700,
  danger: palette.error,
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  displayHeavyItalic: 'Fraunces_700Bold_Italic',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  caption: 'Nunito_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.bodyHeavy, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.caption, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  storyHero: { fontFamily: fonts.displayHeavyItalic, fontSize: 96, lineHeight: 92 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48, screenX: 20 } as const;

export const radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;

export const shadow = {
  e1: { shadowColor: '#4A3426', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  e2: { shadowColor: '#4A3426', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  e3: { shadowColor: '#4A3426', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
} as const;

export const poster = {
  ratio: 2 / 3,
  xs: { width: 40, height: 60 },
  sm: { width: 72, height: 108 },
  md: { width: 104, height: 156 },
  lg: { width: 140, height: 210 },
  radius: radius.md,
} as const;

export const motion = {
  quick: 120,
  base: 220,
  gentle: 400,
  party: 750,
  easing: [0.2, 0.8, 0.2, 1] as const,
  partySpring: { damping: 12, stiffness: 140 },
} as const;

export const touch = { minTarget: 44, buttonHeight: 52, buttonHeightSm: 44, tabBarHeight: 64 } as const;

export const story = {
  exportWidth: 1080,
  exportHeight: 1920,
  safeTop: 220, // px na exportação: livre de UI do Instagram/WhatsApp
  safeBottom: 280,
  slideDurationMs: 6000,
} as const;

export const theme = { palette, party, semantic, fonts, type, space, radius, shadow, poster, motion, touch, story };
export type Theme = typeof theme;
export default theme;
