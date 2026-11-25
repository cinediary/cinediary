import { CaretLeft } from 'phosphor-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { radius, space, touch, makeStyles, useColors } from '@/shared/theme';
import { Screen, Text, Title, type TitleParts } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';

export interface OnboardingFrameProps extends PropsWithChildren {
  /** Passo na barra de progresso. Sem passo: tela fora da contagem (ex.: a pergunta do Letterboxd), sem a barra. */
  step?: 1 | 2 | 3;
  title: TitleParts;
  caption?: string;
  footer: ReactNode;
  /** Ação no topo à direita (ex.: "Pular" no ON-03). */
  topAction?: { label: string; onPress: () => void };
  /** Mostra o voltar (padrão: a partir do passo 2). Ex.: os gêneros, que vêm depois da pergunta do Letterboxd. */
  canGoBack?: boolean;
}

/** Barra comum do onboarding: 3 segmentos de progresso (quando tem `step`), voltar e rodapé fixo. */
export function OnboardingFrame({ step, title, caption, footer, topAction, canGoBack = (step ?? 0) > 1, children }: OnboardingFrameProps) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.onboarding;
  return (
    <Screen scroll footer={footer}>
      {/* Sem voltar, barra nem ação (ex.: a pergunta do Letterboxd): no lugar da faixa do topo, um respiro menor. */}
      {canGoBack || step || topAction ? (
        <View style={styles.top}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.common.back}
              onPress={() => nav.back()}
              hitSlop={10}
              style={styles.back}
            >
              <CaretLeft size={22} color={colors.ink900} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          {step ? (
            <View style={styles.bars} accessible accessibilityLabel={t.stepLabel(step)} accessibilityRole="progressbar">
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.bar, i <= step && styles.barOn]} />
              ))}
            </View>
          ) : (
            <View style={styles.bars} />
          )}
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
      ) : (
        <View style={styles.topSpacer} />
      )}
      <Title parts={title} />
      {caption ? <Text tone="secondary">{caption}</Text> : null}
      {children}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { minWidth: touch.minTarget, minHeight: touch.minTarget, justifyContent: 'center' },
  // Somado ao espaço entre os itens da tela (16): 32 acima do título, metade do que a faixa do topo ocupa.
  topSpacer: { height: space.lg },
  bars: { flex: 1, flexDirection: 'row', gap: space.xs },
  bar: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: c.surfaceSunken },
  barOn: { backgroundColor: c.primary },
}));
