import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { analytics } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { askPushPermission, usePushPermission } from '@/shared/notifications/usePushPermission';
import { fonts, makeStyles, radius, shadow, space } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { OnboardingFrame } from '../components/OnboardingFrame';
import { useFinishOnboarding } from '../components/useFinishOnboarding';

const ICON = require('../../../../../assets/icon.png');

/** Um aviso no estilo da tela de bloqueio, com o ícone do app. Os mais antigos, um pouco menores atrás. */
function Banner({ when, text, index }: { when: string; text: string; index: number }) {
  const styles = useStyles();
  return (
    <Animated.View
      entering={FadeInDown.delay(250 + index * 220).springify().damping(16)}
      style={{ transform: [{ scale: 1 - index * 0.04 }], opacity: 1 - index * 0.15 }}
    >
      <View style={styles.banner}>
        <Image source={ICON} style={styles.icon} />
        <View style={styles.bannerText}>
          <View style={styles.bannerHead}>
            <Text style={styles.app}>CineDiary</Text>
            <Text variant="caption" tone="muted">
              {when}
            </Text>
          </View>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {text}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Último passo do onboarding nos dois caminhos (#14): antes do pedido do sistema, para que servem as
 * notificações, com exemplos. "Ativar" abre o pedido (no iOS ele só aparece uma vez, por isso a tela antes);
 * "Agora não" conclui sem perguntar. Permitindo ou não, o onboarding conclui igual. Se a permissão já foi
 * decidida (ou o app não tem o módulo, num build antigo), conclui direto, sem mostrar nada.
 */
export function OnboardingNotificationsScreen() {
  const styles = useStyles();
  const t = strings.onboarding;
  const permission = usePushPermission();
  const { finishPending, isPending } = useFinishOnboarding();
  const [asking, setAsking] = useState(false);
  const done = useRef(false);

  const conclude = () => {
    if (done.current) return;
    done.current = true;
    finishPending();
  };

  useEffect(() => {
    if (permission.data && permission.data !== 'ask') conclude();
    // Só quando o estado da permissão chega
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission.data]);

  const allow = async () => {
    setAsking(true);
    const granted = await askPushPermission();
    analytics.track('onboarding_notifications', { choice: 'allow', granted });
    conclude();
  };

  const later = () => {
    analytics.track('onboarding_notifications', { choice: 'later', granted: false });
    conclude();
  };

  const busy = asking || isPending;
  const footer = (
    <View style={styles.footer}>
      <Button label={t.notificationsAllow} loading={busy} onPress={() => void allow()} />
      <Button label={t.notificationsLater} variant="ghost" disabled={busy} onPress={later} />
    </View>
  );

  return (
    <OnboardingFrame canGoBack title={t.notificationsTitle} caption={t.notificationsCaption} footer={footer}>
      <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {t.notificationsExamples.map((e, i) => (
          <Banner key={e.text} when={e.when} text={e.text} index={i} />
        ))}
      </View>
    </OnboardingFrame>
  );
}

const useStyles = makeStyles((c) => ({
  stack: { gap: space.sm, paddingTop: space.xl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.xl - 6,
    backgroundColor: c.surface,
    ...shadow.e2,
    shadowOpacity: c.scheme === 'dark' ? 0.4 : 0.1,
    borderWidth: c.scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
    borderColor: c.border,
  },
  icon: { width: 38, height: 38, borderRadius: 9 },
  bannerText: { flex: 1, gap: 2 },
  bannerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  app: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: c.textPrimary },
  footer: { gap: space.xs },
}));
