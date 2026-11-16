import type { TextStyle } from 'react-native';

import type { TitleParts } from '@/shared/i18n';
import { Text, type TextVariant } from './Text';

export type { TitleParts };

export interface TitleProps {
  parts: TitleParts;
  variant?: Extract<TextVariant, 'display' | 'h1' | 'h2'>;
  align?: TextStyle['textAlign'];
}

/** Título com a palavra emocional em itálico (regra da UX-01). */
export function Title({ parts: [before, emphasis, after = ''], variant = 'h1', align }: TitleProps) {
  return (
    <Text variant={variant} accessibilityRole="header" style={align ? { textAlign: align } : undefined}>
      {before}
      <Text variant={variant} italic>
        {emphasis}
      </Text>
      {after}
    </Text>
  );
}
