import { BlurTargetView, BlurView } from 'expo-blur';
import { EyeSlash } from 'phosphor-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { ExpandableText, Text } from '@/shared/ui';
import { useHidesSpoiler } from '../../application/useHidesSpoiler';
import type { DiaryEntry } from '../../domain/diary';

/**
 * Android: o `BlurView` só desfoca com um `blurMethod` e o `blurTarget` (a view que ele desfoca). Sem isso desenhava
 * só uma camada transparente e o spoiler ficava legível. O método usado é o do Android 12+ (rápido, na GPU); antes
 * dele não há desfoque, e o texto fica atrás de um cartão sólido.
 */
const androidBlur = Platform.OS === 'android' && Platform.Version >= 31;
const solidCover = Platform.OS === 'android' && !androidBlur;

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
  expandLines,
}: {
  entry: Pick<DiaryEntry, 'authorId' | 'containsSpoilers' | 'reviewText'>;
  /** Opcional: a tela controla o "revelado" (ex.: revelar a review libera também as respostas). */
  revealed?: boolean;
  onReveal?: () => void;
  /** Cartões (página do título): corta o texto; a review inteira fica na tela da entrada. */
  numberOfLines?: number;
  /** Tela da entrada: corta nessas linhas com "mais" para abrir no lugar. Com spoiler, primeiro revela, depois abre. */
  expandLines?: number;
}) {
  const t = strings.diary;
  const spoiler = useHidesSpoiler(entry);
  const text = entry.reviewText ?? '';
  // Começa revelado para o autor; para os outros, escondido até o toque.
  const [own, setOwn] = useState(false);
  const revealed = controlled ?? own;
  const setRevealed = (v: boolean) => (onReveal ? onReveal() : setOwn(v));
  const hidden = spoiler && !revealed;
  const target = useRef<ComponentRef<typeof View>>(null);
  return (
    <View style={[styles.root, hidden && styles.hidden]}>
      <BlurTargetView ref={target}>
        {expandLines ? (
          <ExpandableText tone="secondary" style={styles.text} lines={expandLines} expandable={!hidden}>
            {text}
          </ExpandableText>
        ) : (
          <Text tone="secondary" style={styles.text} numberOfLines={numberOfLines}>
            {text}
          </Text>
        )}
      </BlurTargetView>
      {hidden ? (
        <Animated.View exiting={FadeOut.duration(220)} style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.spoilerReveal}
            onPress={() => setRevealed(true)}
            style={StyleSheet.absoluteFill}
          >
            {solidCover ? (
              <View style={[StyleSheet.absoluteFill, styles.blur, styles.solid]} />
            ) : (
              <BlurView
                intensity={22}
                tint="light"
                blurTarget={target}
                blurMethod={androidBlur ? 'dimezisBlurViewSdk31Plus' : 'none'}
                // No Android o raio é a intensidade dividida por isto (padrão 4, fraco para esconder texto); ajuste fino aqui.
                blurReductionFactor={1.5}
                style={[StyleSheet.absoluteFill, styles.blur]}
              />
            )}
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
  solid: { backgroundColor: palette.surfaceSunken },
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
