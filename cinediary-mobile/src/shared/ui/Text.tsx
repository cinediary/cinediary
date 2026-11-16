import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { semantic, type as typeScale } from '@/shared/theme';

export type TextVariant = keyof typeof typeScale;
type Tone = 'primary' | 'secondary' | 'muted' | 'link' | 'onPrimary' | 'danger' | 'success';

const toneColor: Record<Tone, string> = {
  primary: semantic.textPrimary,
  secondary: semantic.textSecondary,
  muted: semantic.textMuted,
  link: semantic.link,
  onPrimary: semantic.onPrimary,
  danger: semantic.danger,
  success: semantic.success,
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  /** Usa a variante itálica da Fraunces (palavra emocional dos títulos). */
  italic?: boolean;
}

export function Text({ variant = 'body', tone = 'primary', italic, style, ...rest }: TextProps) {
  const base = typeScale[variant];
  const isDisplayFont = base.fontFamily.startsWith('Fraunces');
  return (
    <RNText
      maxFontSizeMultiplier={2}
      style={[base, { color: toneColor[tone] }, italic && isDisplayFont && { fontFamily: 'Fraunces_600SemiBold_Italic' }, style]}
      {...rest}
    />
  );
}
