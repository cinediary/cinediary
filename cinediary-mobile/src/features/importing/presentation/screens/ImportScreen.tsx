import * as WebBrowser from 'expo-web-browser';
import { ArrowSquareOut, CheckCircle, FilmReel, LockSimple, WarningCircle } from 'phosphor-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space } from '@/shared/theme';
import { Button, Card, Text, Title } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useImportFlow } from '../../application/useImportFlow';
import { hasNothingNew, type FavoritesMode, type ZipValidationError } from '../../domain/importJob';
import { ImportFrame } from '../components/ImportFrame';
import { ImportReview } from '../components/ImportReview';

const LETTERBOXD_EXPORT_URL = 'https://letterboxd.com/settings/data/';

/**
 * A importação dentro do onboarding (a primeira pergunta dele): a pessoa espera o processamento na tela (sem
 * "Continuar usando o app") e o fim conclui o onboarding, em vez de ir para o diário ou para o Juntos.
 * `onDone(cleanup)`: concluir o onboarding e, quando der certo, chamar `cleanup` (limpa a importação salva).
 */
export interface ImportOnboarding {
  onDone: (cleanup: () => Promise<void>) => void;
  finishing: boolean;
}

/**
 * IM-01 a IM-04 · Importação do ZIP do Letterboxd, em tela inteira (antes era um modal).
 * Todos os passos usam a mesma moldura (ImportFrame): voltar no topo e ações fixas no rodapé.
 * Voltar (ou falhar) dentro do onboarding volta para a pergunta do Letterboxd.
 */
export function ImportScreen({ onboarding }: { onboarding?: ImportOnboarding } = {}) {
  const t = strings.importing;
  const flow = useImportFlow();
  const job = flow.job;
  const [favoritesMode, setFavoritesMode] = useState<FavoritesMode>('REPLACE');

  const goTo = (path: '/(tabs)' | '/(tabs)/together') => {
    void flow.reset();
    nav.navigate(path);
  };

  // Falha (rede ou job FAILED)
  if (flow.jobError || job?.status === 'FAILED') {
    return (
      <ImportFrame
        centered
        footer={
          <>
            <Button label={strings.common.retry} onPress={() => void flow.reset()} />
            <Button label={t.back} variant="ghost" onPress={() => nav.back()} />
          </>
        }
      >
        <Badge tone="error" icon={<WarningCircle size={40} color={palette.error} weight="duotone" />} />
        <Title parts={['', t.failed, '']} align="center" />
        <Text tone="secondary" style={styles.textCenter}>
          {t.failedHint}
        </Text>
      </ImportFrame>
    );
  }

  // IM-02 · enviando / processando / aplicando
  if (flow.step === 'uploading' || (flow.step === 'job' && (!job || job.status === 'PARSING' || job.status === 'APPLYING'))) {
    const label = flow.step === 'uploading' ? t.uploading : job?.status === 'APPLYING' ? t.applying : t.parsing(job?.totalItemsRead ?? 0);
    return (
      <ImportFrame centered footer={onboarding ? undefined : <Button label={t.keepUsing} variant="secondary" onPress={() => nav.back()} />}>
        <SpinningReel />
        <Text variant="h2" style={styles.textCenter} accessibilityLiveRegion="polite">
          {label}
        </Text>
        {onboarding ? null : (
          <Text tone="secondary" style={styles.textCenter}>
            {t.canLeave}
          </Text>
        )}
      </ImportFrame>
    );
  }

  // IM-03 · revisão antes de confirmar
  if (job?.status === 'AWAITING_CONFIRMATION') {
    const nothingNew = hasNothingNew(job);
    return (
      <ImportFrame
        footer={
          nothingNew ? (
            onboarding ? (
              <Button label={strings.onboarding.continue} loading={onboarding.finishing} onPress={() => onboarding.onDone(flow.reset)} />
            ) : (
              <Button label={t.ok} onPress={() => void flow.reset().then(() => nav.back())} />
            )
          ) : (
            <>
              {flow.confirmError ? (
                <Text tone="danger" style={styles.textCenter} accessibilityLiveRegion="polite">
                  {t.confirmFailed}
                </Text>
              ) : null}
              <Button label={t.confirm} loading={flow.confirming} onPress={() => flow.confirm(favoritesMode)} />
              <Button label={strings.common.cancel} variant="ghost" disabled={flow.confirming} onPress={() => void flow.reset()} />
            </>
          )
        }
      >
        {nothingNew ? <Text tone="secondary">{t.nothingNew}</Text> : null}
        <ImportReview job={job} favoritesMode={favoritesMode} onFavoritesMode={setFavoritesMode} />
      </ImportFrame>
    );
  }

  // IM-04 · concluído
  if (job?.status === 'COMPLETED') {
    return (
      <ImportFrame
        centered
        footer={
          onboarding ? (
            <Button label={strings.onboarding.continue} loading={onboarding.finishing} onPress={() => onboarding.onDone(flow.reset)} />
          ) : (
            <>
              <Button label={t.seeDiary} onPress={() => goTo('/(tabs)')} />
              <Button label={t.createMatch} variant="secondary" onPress={() => goTo('/(tabs)/together')} />
            </>
          )
        }
      >
        <Badge tone="success" icon={<CheckCircle size={44} color={semantic.success} weight="duotone" />} />
        <Title parts={t.doneTitle(job.matchedCount)} align="center" />
        <Text tone="secondary" style={styles.textCenter}>
          {t.doneSummary(job.diaryEntriesCreated ?? job.diaryEntriesCount, job.reviewsCount)}
        </Text>
      </ImportFrame>
    );
  }

  // IM-01 · como exportar e escolher o arquivo
  const steps = [t.step1, t.step2, t.step3];
  return (
    <ImportFrame
      footer={
        <>
          {flow.validationError ? (
            <Text tone="danger" style={styles.textCenter} accessibilityLiveRegion="polite">
              {validationMessage(flow.validationError)}
            </Text>
          ) : null}
          <Button label={t.pick} onPress={() => void flow.pickAndUpload()} />
        </>
      }
    >
      <View style={styles.hero}>
        <Badge tone="brand" icon={<FilmReel size={40} color={palette.terracota500} weight="duotone" />} />
        <Title parts={t.title} />
        <Text tone="secondary">{t.subtitle}</Text>
      </View>

      <View style={styles.section}>
        <Text variant="overline" tone="secondary">
          {t.includesTitle}
        </Text>
        <View style={styles.chips}>
          {t.includes.map((item) => (
            <View key={item} style={styles.chip}>
              <Text variant="caption" style={styles.chipText}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Card>
        <View style={styles.section}>
          <Text variant="overline" tone="secondary">
            {t.howToTitle}
          </Text>
          {steps.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="bodyStrong" tone="onPrimary">
                  {i + 1}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text>{s}</Text>
                {i === 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => void WebBrowser.openBrowserAsync(LETTERBOXD_EXPORT_URL)}
                    hitSlop={8}
                    style={styles.link}
                  >
                    <Text variant="bodyStrong" tone="link">
                      {t.openLetterboxd}
                    </Text>
                    <ArrowSquareOut size={16} color={palette.terracota700} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.trust}>
        <LockSimple size={18} color={palette.ink700} />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          {t.trust}
        </Text>
      </View>
    </ImportFrame>
  );
}

const validationMessage = (e: ZipValidationError) => (e === 'NOT_ZIP' ? strings.importing.notZip : strings.importing.tooBig);

/** Ícone grande num círculo colorido: dá um ponto focal para cada passo. */
function Badge({ icon, tone }: { icon: ReactNode; tone: 'brand' | 'success' | 'error' }) {
  const background = tone === 'success' ? palette.salvia100 : tone === 'error' ? palette.rosa100 : palette.terracota100;
  return <View style={[styles.badge, { backgroundColor: background }]}>{icon}</View>;
}

/** Rolo de filme girando enquanto processa (parado com "Reduzir movimento"). */
function SpinningReel() {
  const reduce = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!reduce) turn.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false));
  }, [reduce, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <View style={[styles.badge, styles.badgeLarge, { backgroundColor: palette.terracota100 }]}>
      <Animated.View style={spin}>
        <FilmReel size={56} color={palette.terracota500} weight="duotone" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  textCenter: { textAlign: 'center' },
  flex: { flex: 1 },
  hero: { gap: space.md },
  section: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken },
  chipText: { color: palette.ink900, fontFamily: 'Nunito_700Bold' },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, alignSelf: 'flex-start' },
  trust: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  badge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  badgeLarge: { width: 112, height: 112, borderRadius: 56 },
});
