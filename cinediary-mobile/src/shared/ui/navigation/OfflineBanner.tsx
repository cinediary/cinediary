import { WifiSlash } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { Text } from '../Text';

/**
 * Faixa discreta no topo quando a conexão cai durante o uso (sem internet ou a API sem responder): as telas continuam com o que já carregaram, e ela some
 * sozinha quando a conexão volta. Não bloqueia toques (fica por cima, mas deixa passar).
 */
export function OfflineBanner({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + space.xs }]}>
      <Animated.View
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(180)}
        style={styles.pill}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <WifiSlash size={16} weight="bold" color={palette.surface} />
        <Text variant="caption" style={styles.text}>
          {strings.common.offline}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.screenX, right: space.screenX, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '100%',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.ink900,
  },
  text: { color: palette.surface, flexShrink: 1 },
});
