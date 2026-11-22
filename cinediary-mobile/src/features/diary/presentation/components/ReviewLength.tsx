import { StyleSheet, View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { REVIEW_MAX } from '../../domain/diary';

/** O contador só aparece perto do limite: antes disso ele só pesaria na tela. */
const SHOW_FROM = Math.round(REVIEW_MAX * 0.9);

/**
 * Contador discreto da review ("1.150 / 1.200"), a partir de 90% do limite. Acima do limite (review importada do
 * Letterboxd) fica vermelho e explica que só dá para apagar.
 */
export function ReviewLength({ text }: { text: string }) {
  const length = text.length;
  if (length < SHOW_FROM) return null;
  const over = length > REVIEW_MAX;
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <Text variant="caption" tone={over ? 'danger' : 'muted'} style={styles.count}>
        {`${formatNumber(length)} / ${formatNumber(REVIEW_MAX)}`}
      </Text>
      {over ? (
        <Text variant="caption" tone="danger">
          {strings.diary.reviewOverLimit(formatNumber(REVIEW_MAX))}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs, alignItems: 'flex-end' },
  count: { fontVariant: ['tabular-nums'] },
});
