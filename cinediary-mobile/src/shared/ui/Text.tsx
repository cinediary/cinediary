import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type as typeScale, makeStyles } from '@/shared/theme';

export type TextVariant = keyof typeof typeScale;
type Tone = 'primary' | 'secondary' | 'muted' | 'link' | 'onPrimary' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  /** Usa a variante itálica da Fraunces (palavra emocional dos títulos). */
  italic?: boolean;
}

export function Text({ variant = 'body', tone = 'primary', italic, style, ...rest }: TextProps) {
  const tones = useTones();
  const base = typeScale[variant];
  const isDisplayFont = base.fontFamily.startsWith('Fraunces');
  return (
    <RNText
      maxFontSizeMultiplier={2}
      style={[base, tones[tone], italic && isDisplayFont && { fontFamily: 'Fraunces_600SemiBold_Italic' }, style]}
      {...rest}
    />
  );
}

// A cor de cada tom vem do tema (#61)
const useTones = makeStyles((c) => ({
  primary: { color: c.textPrimary },
  secondary: { color: c.textSecondary },
  muted: { color: c.textMuted },
  link: { color: c.link },
  onPrimary: { color: c.onPrimary },
  danger: { color: c.danger },
  success: { color: c.success },
}));
