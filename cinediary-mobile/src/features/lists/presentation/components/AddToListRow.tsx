import { CaretRight, ListPlus } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { useMyLists } from '../../application/listsQueries';

/**
 * Na página do título (#22): uma linha discreta "Adicionar a uma lista", abaixo das ações, que abre a folha.
 * Se o título já está em listas suas, diz em quantas.
 */
export function AddToListRow({ title, onPress }: { title: TitleSummary; onPress: () => void }) {
  const t = strings.lists;
  const mine = useMyLists(title.id);
  const inLists = mine.data?.filter((m) => m.containsTitle).length ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.addToList}
      accessibilityHint={inLists ? t.addToListIn(inLists) : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <ListPlus size={20} color={palette.terracota700} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{t.addToList}</Text>
        {inLists ? (
          <Text variant="caption" tone="muted">
            {t.addToListIn(inLists)}
          </Text>
        ) : null}
      </View>
      <CaretRight size={16} color={palette.ink500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.terracota100,
  },
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.75 },
});
