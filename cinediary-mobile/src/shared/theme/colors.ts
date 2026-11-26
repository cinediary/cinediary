import { palette } from './tokens';

/**
 * As cores do tema (#61): as mesmas chaves da `palette` mais as semânticas, numa versão clara e numa escura.
 * As telas pegam pelo `useColors()` (ou pelos estilos do `makeStyles`), então trocar o tema troca tudo na hora.
 */
export type Palette = { [K in keyof typeof palette]: string };

export interface Colors extends Palette {
  scheme: 'light' | 'dark';
  background: string;
  card: string;
  textPrimary: string;
  /** Contorno fino por cima de uma foto: marca a borda sem esconder a imagem. */
  imageOutline: string;
  textSecondary: string;
  textMuted: string;
  iconInactive: string;
  primary: string;
  onPrimary: string;
  link: string;
  watched: string;
  progress: string;
  liked: string;
  starFill: string;
  starStroke: string;
  success: string;
  warning: string;
  danger: string;
  /** Véu atrás das folhas e menus (escurece a tela). */
  backdrop: string;
}

/**
 * Paleta escura "Mista" (escolhida no Design System): o fundo preto e neutro de uma sala de cinema, com os
 * cartões e os textos quentes do "diário de papel". Os acentos ficam mais claros, e os tons 100 viram fundos
 * tingidos escuros. Contraste (WCAG): texto 16:1, secundário 10,7:1, o mais apagado ≥ 5,9:1 até nos cartões,
 * link 8:1 e o texto do botão primário 6:1.
 */
export const darkPalette: Palette = {
  bg: '#0F0F10',
  surface: '#1C1916',
  surfaceSunken: '#0A0A0B',
  border: '#2C2723',
  borderStrong: '#433A33',
  ink900: '#F3EBE2',
  ink700: '#CDBFB2',
  ink500: '#A29384',
  ink400: '#7E7064',
  terracota100: '#3A2219',
  terracota300: '#7A3F2A',
  terracota500: '#D9785A',
  terracota600: '#D9785A',
  terracota700: '#EE9A7C',
  pipoca100: '#3A2E14',
  pipoca300: '#6E5521',
  pipoca500: '#E3B04C',
  pipoca600: '#C9962F',
  pipoca700: '#F0C770',
  salvia100: '#1F2A1C',
  salvia300: '#3D5236',
  salvia500: '#8FB083',
  salvia700: '#A9C99C',
  rosa100: '#3A2220',
  rosa300: '#6B3B37',
  rosa500: '#E0968F',
  rosa700: '#F0B1AA',
  error: '#EF7A6B',
};

function build(p: Palette, scheme: 'light' | 'dark'): Colors {
  const dark = scheme === 'dark';
  return {
    ...p,
    scheme,
    background: p.bg,
    card: p.surface,
    textPrimary: p.ink900,
    imageOutline: dark ? 'rgba(243,235,226,0.12)' : 'rgba(42,33,28,0.12)',
    textSecondary: p.ink700,
    textMuted: p.ink500,
    iconInactive: p.ink400,
    primary: p.terracota600,
    // No escuro o terracota é claro: o texto do botão fica escuro (no claro, o creme)
    onPrimary: dark ? p.bg : p.surface,
    link: p.terracota700,
    watched: p.salvia700,
    progress: p.salvia500,
    liked: p.rosa500,
    starFill: p.pipoca500,
    starStroke: p.pipoca600,
    success: p.salvia700,
    warning: p.pipoca700,
    danger: p.error,
    backdrop: dark ? 'rgba(0,0,0,0.6)' : 'rgba(42,33,28,0.4)',
  };
}

export const lightColors = build(palette, 'light');
export const darkColors = build(darkPalette, 'dark');

/** `#RRGGBB` com transparência (0 a 1), para véus e degradês feitos com a cor do tema. */
export function alpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${opacity})`;
}
