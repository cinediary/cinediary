import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { fonts, party, radius, space, touch, useColors, type Colors, makeStyles } from '@/shared/theme';
import { Button } from './Button';
import { BrandC, BrandStar, starRestRect } from './splash/BrandGlyphs';
import { STAR_REST_ROTATION } from './splash/brandMark';
import { Text } from './Text';

export type ConnectionProblem = 'offline' | 'server';
/** Duas versões do visual (compare no catálogo do Design System, aba "Telas"). */
export type ConnectionErrorVariant = 'dark' | 'light';
/**
 * A versão usada no app. Para trocar, mude aqui: 'light' = fundo creme com o "c" terracota;
 * 'dark' = fundo terracota, continuando a splash.
 */
export const APP_CONNECTION_ERROR_VARIANT: ConnectionErrorVariant = 'light';

const MARK = 150; // tamanho do "c" (mesma proporção do ícone)
const rest = starRestRect(MARK);
/** Onde a estrela cai: no "chão", à direita do pé do "c" (deslocamento a partir do lugar dela no ícone). */
const FLOOR_Y = MARK * 0.728; // o pé do "c" (y ≈ 745 no canvas 1024 do ícone)
const FALL_X = MARK * 0.13;
// centro da estrela caída = um pouco acima do chão (ela fica deitada, menos alta que em pé)
const FALL_Y = FLOOR_Y - rest.size * 0.42 - (rest.top + rest.size / 2);
const FALLEN_ROTATION = STAR_REST_ROTATION + 120; // tombada

const THEMES = (c: Colors) => ({
  dark: {
    background: c.terracota600,
    mark: party.cream,
    star: party.butter,
    shadow: 'rgba(42,33,28,0.22)',
    title: party.cream,
    body: 'rgba(255,244,230,0.86)',
    statusBar: 'light' as const,
  },
  light: {
    background: c.background,
    mark: c.terracota600,
    star: c.pipoca500,
    shadow: 'rgba(42,33,28,0.12)',
    title: c.ink900,
    body: c.ink700,
    statusBar: c.scheme === 'dark' ? ('light' as const) : ('dark' as const),
  },
});

/**
 * Tela de "sem conexão": a estrela do ícone se solta do "c", cai no chão e fica balançando, como quem
 * perdeu o sinal. Dois casos:
 * - `offline`: o celular está sem internet;
 * - `server`: a internet funciona, mas o CineDiary não respondeu.
 * `onSignOut` (opcional) aparece só no caso do servidor, para quem quer trocar de conta.
 * Com "Reduzir movimento": a estrela já aparece caída, parada.
 */
export function ConnectionErrorScreen({
  problem,
  variant = APP_CONNECTION_ERROR_VARIANT,
  onRetry,
  retrying = false,
  onSignOut,
}: {
  problem: ConnectionProblem;
  variant?: ConnectionErrorVariant;
  onRetry: () => void;
  retrying?: boolean;
  onSignOut?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.common.connection;
  const theme = THEMES(colors)[variant];
  const reduceMotion = useReducedMotion();
  const loosen = useSharedValue(0); // a estrela "se solta": treme no lugar
  const fall = useSharedValue(reduceMotion ? 1 : 0); // 0 = no lugar do ícone, 1 = no chão
  const rock = useSharedValue(0); // balanço no chão

  useEffect(() => {
    if (reduceMotion) return;
    loosen.set(
      withDelay(
        350,
        withSequence(
          withTiming(1, { duration: 70 }),
          withTiming(-1, { duration: 90 }),
          withTiming(1, { duration: 90 }),
          withTiming(0, { duration: 70 }),
        ),
      ),
    );
    fall.set(withDelay(700, withTiming(1, { duration: 800, easing: Easing.bounce })));
    rock.set(
      withDelay(
        1600,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
            withTiming(-1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      ),
    );
  }, [reduceMotion, loosen, fall, rock]);

  const starStyle = useAnimatedStyle(() => {
    const f = fall.get();
    return {
      transform: [
        { translateX: FALL_X * f },
        { translateY: FALL_Y * f },
        { rotate: `${STAR_REST_ROTATION + (FALLEN_ROTATION - STAR_REST_ROTATION) * f + loosen.get() * 8 + rock.get() * 7}deg` },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => {
    const f = fall.get();
    return { opacity: f, transform: [{ scaleX: 0.6 + 0.4 * f + rock.get() * 0.05 }] };
  });

  const title = problem === 'offline' ? t.offlineTitle : t.serverTitle;
  const body = problem === 'offline' ? t.offlineBody : t.serverBody;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BrandC size={MARK} color={theme.mark} />
        {/* sombra no chão, onde a estrela cai */}
        <Animated.View
          style={[
            styles.shadow,
            {
              backgroundColor: theme.shadow,
              width: rest.size * 1.2,
              left: rest.left + FALL_X - rest.size * 0.1,
              top: FLOOR_Y - 3,
            },
            shadowStyle,
          ]}
        />
        <Animated.View style={[styles.star, { width: rest.size, height: rest.size, left: rest.left, top: rest.top }, starStyle]}>
          <BrandStar size={rest.size} color={theme.star} />
        </Animated.View>
      </View>

      <View style={styles.texts}>
        <Text variant="h2" accessibilityRole="header" style={[styles.center, { color: theme.title }]}>
          {title}
        </Text>
        <Text style={[styles.center, styles.body, { color: theme.body }]}>{body}</Text>
      </View>

      <View style={styles.actions}>
        {variant === 'dark' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: retrying }}
            disabled={retrying}
            onPress={onRetry}
            style={({ pressed }) => [styles.creamButton, pressed && styles.pressed]}
          >
            {retrying ? <ActivityIndicator color={colors.terracota700} /> : null}
            <Text style={styles.creamButtonText}>{retrying ? t.retrying : t.retry}</Text>
          </Pressable>
        ) : (
          <Button label={retrying ? t.retrying : t.retry} onPress={onRetry} loading={retrying} />
        )}
        {onSignOut && problem === 'server' ? (
          <Pressable accessibilityRole="button" onPress={onSignOut} hitSlop={8} style={styles.signOut}>
            <Text variant="bodyStrong" style={{ color: variant === 'dark' ? party.cream : colors.terracota700 }}>
              {t.signOut}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, gap: space.xl },
  mark: { width: MARK, height: MARK },
  star: { position: 'absolute' },
  shadow: { position: 'absolute', height: 6, borderRadius: 3 },
  texts: { gap: space.sm, maxWidth: 320 },
  center: { textAlign: 'center' },
  body: { lineHeight: 22 },
  actions: { alignSelf: 'stretch', gap: space.md, alignItems: 'center' },
  creamButton: {
    alignSelf: 'stretch',
    minHeight: touch.buttonHeight,
    borderRadius: radius.pill,
    backgroundColor: party.cream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  creamButtonText: { fontFamily: fonts.bodyHeavy, color: c.terracota700, fontSize: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  signOut: { minHeight: 44, justifyContent: 'center' },
}));
