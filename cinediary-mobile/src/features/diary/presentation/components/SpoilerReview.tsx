import { BlurView } from 'expo-blur';
import { EyeSlash } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { useHidesSpoiler } from '../../application/useHidesSpoiler';
import type { DiaryEntry } from '../../domain/diary';

/**
 * Texto da review. Com spoiler (e quem vê não é o autor: veja `hidesSpoiler`), ele fica desfocado por baixo de um aviso "Contém spoiler · Toque para
 * ver"; o toque tira o desfoque com um fade (o texto já está no lugar, nada pula). Fica revelado só
 * nesta tela; ao voltar, esconde de novo.
 */
export function SpoilerReview({
  entry,
  revealed: controlled,
  onReveal,
  numberOfLines,
}: {
  entry: Pick<DiaryEntry, 'authorId' | 'containsSpoilers' | 'reviewText'>;
  /** Opcional: a tela controla o "revelado" (ex.: revelar a review libera também as respostas). */
  revealed?: boolean;
  onReveal?: () => void;
  /** Cartões (página do título): corta o texto; a review inteira fica na tela da entrada. */
  numberOfLines?: number;
}) {
  const t = strings.diary;
  const spoiler = useHidesSpoiler(entry);
  const text = entry.reviewText ?? '';
  // Começa revelado para o autor; para os outros, escondido até o toque.
  const [own, setOwn] = useState(false);
  const revealed = controlled ?? own;
  const setRevealed = (v: boolean) => (onReveal ? onReveal() : setOwn(v));
  const hidden = spoiler && !revealed;
  return (
    <View style={[styles.root, hidden && styles.hidden]}>
      <Text tone="secondary" style={styles.text} numberOfLines={numberOfLines}>
        {text}
      </Text>
      {hidden ? (
        <Animated.View exiting={FadeOut.duration(220)} style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.spoilerReveal}
            onPress={() => setRevealed(true)}
            style={StyleSheet.absoluteFill}
          >
            <BlurView intensity={22} tint="light" style={[StyleSheet.absoluteFill, styles.blur]} />
            <View style={styles.badgeWrap}>
              <View style={styles.badge}>
                <EyeSlash size={16} color={palette.ink900} />
                <Text variant="caption" style={styles.badgeText}>
                  {t.spoilerBadge}
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderRadius: radius.md, overflow: 'hidden' },
  // Review curta com spoiler: altura mínima para o aviso caber por cima.
  hidden: { minHeight: 64 },
  text: { lineHeight: 24 },
  blur: { borderRadius: radius.md },
  badgeWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,253,249,0.92)',
    borderWidth: 1,
    borderColor: palette.border,
  },
  badgeText: { color: palette.ink900, fontFamily: 'Nunito_800ExtraBold' },
});
