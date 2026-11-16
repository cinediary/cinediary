import { router } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { Screen, Text, Title, type TitleParts } from '@/shared/ui';

export interface OnboardingFrameProps extends PropsWithChildren {
  step: 1 | 2 | 3;
  title: TitleParts;
  caption?: string;
  footer: ReactNode;
  /** Ação no topo à direita (ex.: "Pular" no ON-03). */
  topAction?: { label: string; onPress: () => void };
}

/** Barra comum do onboarding: 3 segmentos de progresso, voltar e rodapé fixo. */
export function OnboardingFrame({ step, title, caption, footer, topAction, children }: OnboardingFrameProps) {
  const t = strings.onboarding;
  return (
    <Screen scroll footer={footer}>
      <View style={styles.top}>
        {step > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.back}
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.back}
          >
            <CaretLeft size={22} color={palette.ink900} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.bars} accessible accessibilityLabel={t.stepLabel(step)} accessibilityRole="progressbar">
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.bar, i <= step && styles.barOn]} />
          ))}
        </View>
        {topAction ? (
          <Pressable accessibilityRole="button" onPress={topAction.onPress} hitSlop={10} style={styles.back}>
            <Text variant="bodyStrong" tone="link">
              {topAction.label}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
      </View>
      <Title parts={title} />
      {caption ? <Text tone="secondary">{caption}</Text> : null}
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { minWidth: touch.minTarget, minHeight: touch.minTarget, justifyContent: 'center' },
  bars: { flex: 1, flexDirection: 'row', gap: space.xs },
  bar: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken },
  barOn: { backgroundColor: semantic.primary },
});
