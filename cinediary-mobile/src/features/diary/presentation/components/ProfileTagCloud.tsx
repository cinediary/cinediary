import { Tag } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { fonts, radius, space, makeStyles, useColors } from '@/shared/theme';
import { Skeleton, Text } from '@/shared/ui';
import { useMyTags } from '../../application/diaryQueries';
import { openDiaryWithTag } from '../navigation';

const MAX = 30;

/** As suas tags no perfil (#58, opção 1 do Design System): as mais usadas maiores; tocar abre o diário filtrado. */
export function ProfileTagCloud() {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.diary;
  const tags = useMyTags();
  const all = (tags.data ?? []).slice(0, MAX);

  if (tags.isPending) {
    return (
      <View style={styles.cloud}>
        <Skeleton width={96} height={36} radius={radius.pill} />
        <Skeleton width={72} height={36} radius={radius.pill} />
        <Skeleton width={120} height={36} radius={radius.pill} />
      </View>
    );
  }
  if (all.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Tag size={20} weight="bold" color={colors.terracota700} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t.profileTagsEmptyTitle}</Text>
          <Text variant="caption" tone="secondary">
            {t.profileTagsEmptyText}
          </Text>
        </View>
      </View>
    );
  }

  const max = all[0].entries;
  const min = all[all.length - 1].entries;
  return (
    <View style={styles.cloud}>
      {all.map(({ tag, entries }) => {
        // Pela posição entre a menos e a mais usada: com todas no mesmo número, todas ficam no tamanho base.
        const weight = max === min ? 0 : (entries - min) / (max - min);
        const fontSize = 13 + Math.round(weight * 5);
        return (
          <Pressable
            key={tag}
            accessibilityRole="button"
            accessibilityLabel={t.tagCloudA11y(tag, entries)}
            onPress={() => openDiaryWithTag(tag)}
            style={({ pressed }) => [styles.tag, weight > 0.6 && styles.tagStrong, pressed && styles.pressed]}
          >
            <Text style={[styles.tagText, { fontSize, lineHeight: fontSize + 4 }]}>#{tag}</Text>
            <Text variant="caption" tone="muted">
              {entries}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  cloud: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  tagStrong: { backgroundColor: c.terracota100 },
  tagText: { fontFamily: fonts.bodyHeavy, color: c.ink900 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.terracota100,
  },
}));
