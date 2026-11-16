import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button } from './Button';
import { Text } from './Text';
import { Title, type TitleParts } from './Title';

export interface EmptyStateProps {
  illustration?: ReactNode;
  /** Título com a palavra emocional separada: ['Seu diário está ', 'em branco', ''] */
  title: string | TitleParts;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** Vazio nunca "seco": sempre com texto e, quando possível, uma ação (UX-01). */
export function EmptyState({ illustration, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      {illustration}
      {typeof title === 'string' ? (
        <Text variant="h2" style={styles.center} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <Title parts={title} variant="h2" align="center" />
      )}
      <Text tone="secondary" style={styles.center}>
        {description}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
      {secondaryLabel && onSecondary ? <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.lg, padding: space.xl },
  center: { textAlign: 'center' },
});
