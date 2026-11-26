import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors, radius, space, makeStyles } from '@/shared/theme';
import { Text } from './Text';

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

/**
 * Quanto tempo o toast fica na tela. Sem ação ("Salvo", "Texto copiado") é só um aviso e sai rápido: 4 s parecia
 * lento. Com ação ("Tentar de novo") fica mais, para dar tempo de tocar.
 */
const DURATION_MS = 1500;
const DURATION_WITH_ACTION_MS = 4000;

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});

/** Snackbar da UX-01: pílula ink900, texto creme, ação opcional; 1,5 s (4 s com ação). */
export function ToastProvider({ children }: PropsWithChildren) {
  const styles = useStyles();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, message, ...options });
    AccessibilityInfo.announceForAccessibility(message);
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), options.durationMs ?? (options.actionLabel ? DURATION_WITH_ACTION_MS : DURATION_MS));
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
          <Animated.View key={toast.id} entering={FadeInDown} exiting={FadeOutDown} style={styles.toast}>
            <Text variant="bodyStrong" style={styles.message}>
              {toast.message}
            </Text>
            {toast.actionLabel && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                hitSlop={8}
              >
                <Text variant="bodyStrong" style={styles.action}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const useStyles = makeStyles((c) => ({
  host: { position: 'absolute', left: space.screenX, right: space.screenX, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: c.ink900,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    maxWidth: '100%',
  },
  message: { color: c.surface, flexShrink: 1 },
  // No escuro a pílula fica creme: a ação vira terracota escuro (o pipoca claro some no creme)
  action: { color: c.scheme === 'dark' ? lightColors.terracota700 : c.pipoca300 },
}));
