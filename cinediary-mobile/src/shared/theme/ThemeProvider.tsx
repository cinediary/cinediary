import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import {
  createContext,
  type ComponentRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance, Dimensions, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';

import { darkColors, lightColors, type Colors } from './colors';

/** O que a pessoa escolheu em Configurações: seguir o aparelho, ou forçar claro ou escuro. */
export type AppearancePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cinediary.appearance';

/**
 * Enquanto as telas passam para as cores do tema (#61, por etapas), "Automático" fica no claro: só quem escolhe
 * Escuro (em desenvolvimento) vê o tema escuro. A última etapa liga isto e o `userInterfaceStyle: automatic`.
 */
const FOLLOW_SYSTEM = false;

/** Quanto dura o esmaecer entre os temas. */
const CROSSFADE_MS = 420;

interface ThemeValue {
  scheme: 'light' | 'dark';
  colors: Colors;
  preference: AppearancePreference;
  setPreference: (p: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: 'light',
  colors: lightColors,
  preference: 'system',
  setPreference: () => undefined,
});

const resolve = (p: AppearancePreference, system: string | null | undefined): 'light' | 'dark' =>
  p === 'light' || p === 'dark' ? p : FOLLOW_SYSTEM && system === 'dark' ? 'dark' : 'light';

/**
 * O tema do app (#61): a escolha (guardada no aparelho), as cores em uso (`useColors`, `makeStyles`), o aviso ao
 * sistema (`Appearance.setColorScheme`, para teclado, alertas e barras nativas) e o esmaecer: uma foto da tela
 * como está fica por cima, o tema troca por baixo (as telas redesenham) e, com tudo pronto, a foto se desfaz.
 * Com "Reduzir movimento", troca direto. Só mostra o app depois de ler a escolha guardada (é rápido, com a
 * splash ainda na tela).
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setState] = useState<AppearancePreference | null>(null);
  const system = useColorScheme();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const pending = useRef<AppearancePreference | null>(null);
  const fading = useRef(false);
  const opacity = useSharedValue(1);
  const finish = useCallback(() => {
    pending.current = null;
    setSnapshot(null);
  }, []);
  // Lidos pelo setPreference sem recriá-lo
  const latest = useRef({ preference, system, reduceMotion });
  useLayoutEffect(() => {
    latest.current = { preference, system, reduceMotion };
  }, [preference, system, reduceMotion]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => (v === 'light' || v === 'dark' ? v : 'system'))
      .catch((): AppearancePreference => 'system')
      .then((p) => setState(p));
  }, []);

  const scheme = preference ? resolve(preference, system) : 'light';

  // O tema do sistema acompanha a escolha
  useLayoutEffect(() => {
    if (!preference) return;
    Appearance.setColorScheme(preference !== 'system' ? preference : FOLLOW_SYSTEM ? 'unspecified' : 'light');
  }, [preference]);

  // As telas já redesenharam com o tema novo por baixo da foto: no quadro seguinte, ela esmaece
  useEffect(() => {
    if (!snapshot || !fading.current) return;
    fading.current = false;
    requestAnimationFrame(() =>
      opacity.set(
        withTiming(0, { duration: CROSSFADE_MS, easing: Easing.out(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      ),
    );
  }, [scheme, preference, snapshot, opacity, finish]);

  const setPreference = useCallback(
    (p: AppearancePreference) => {
      void AsyncStorage.setItem(STORAGE_KEY, p).catch(() => undefined);
      const { preference: current, system: sys, reduceMotion: reduce } = latest.current;
      // Com claro ou escuro forçado, o "sistema" lido aqui é o forçado: não dá para saber se "Automático" muda as
      // cores, então esmaece mesmo assim (se nada mudar, a foto some sobre a mesma tela, sem se notar)
      const changesColors = current !== null && p !== current && (current !== 'system' || resolve(p, sys) !== resolve(current, sys));
      if (!changesColors || reduce || pending.current || !rootRef.current) {
        setState(p);
        return;
      }
      pending.current = p;
      // Na resolução 1x (e não 3x): 9 vezes menos pixels, e a foto só aparece esmaecendo
      const { width, height } = Dimensions.get('window');
      captureRef(rootRef, { format: 'jpg', quality: 0.8, result: 'tmpfile', width, height })
        .then((uri) => {
          opacity.set(1);
          setSnapshot(uri);
        })
        .catch(() => {
          pending.current = null;
          setState(p);
        });
    },
    [opacity],
  );

  // A foto já está na tela: troca o tema por baixo (o esmaecer começa no efeito acima, depois do redesenho)
  const onSnapshotShown = useCallback(() => {
    const next = pending.current;
    if (!next) return;
    fading.current = true;
    setState(next);
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const value = useMemo(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors, preference: preference ?? 'system', setPreference }),
    [scheme, preference, setPreference],
  );

  if (!preference) return null;
  return (
    <ThemeContext.Provider value={value}>
      <View ref={rootRef} collapsable={false} style={styles.root}>
        {children}
      </View>
      {snapshot ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fadeStyle]}>
          <Image source={{ uri: snapshot }} style={styles.root} onDisplay={onSnapshotShown} transition={0} cachePolicy="none" />
        </Animated.View>
      ) : null}
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

/** A escolha de aparência e o tema em uso (para Configurações e o Design System). */
export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/** As cores do tema atual, para o que não é estilo (cor de ícone, de indicador, de prop de biblioteca). */
export function useColors(): Colors {
  return useContext(ThemeContext).colors;
}

type Styles = Parameters<typeof StyleSheet.create>[0];

/**
 * Estilos que dependem do tema: `const useStyles = makeStyles((c) => ({ … }))` no módulo e
 * `const styles = useStyles()` no componente. Cada tema é criado uma vez só e fica guardado.
 */
export function makeStyles<T extends Styles>(build: (c: Colors) => T): () => T {
  const cache: Partial<Record<Colors['scheme'], T>> = {};
  return function useStyles() {
    const c = useColors();
    return (cache[c.scheme] ??= StyleSheet.create(build(c)) as T);
  };
}
