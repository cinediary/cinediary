import { requireOptionalNativeModule } from 'expo';
import { DotsThree } from 'phosphor-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, touch } from '@/shared/theme';
import { ActionSheet } from '../ActionSheet';
import type { MoreMenuOption } from './types';

/**
 * O `@expo/ui` só existe no binário que o inclui (development build ou loja). O import dele já busca as views
 * nativas, então num binário sem ele (um Expo Go sem o módulo, por exemplo) quebraria a tela. Por isso o
 * arquivo nativo só é carregado se o módulo existir; senão, fica o menu do próprio app.
 */
const NativeMoreMenu =
  Platform.OS !== 'web' && requireOptionalNativeModule('ExpoUI') != null
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- carregar só se o módulo nativo existir
      (require('./NativeMoreMenu') as typeof import('./NativeMoreMenu')).NativeMoreMenu
    : null;

/**
 * O "⋯" redondo com o menu de ações: o menu nativo de cada sistema (iOS: `Menu` do SwiftUI; Android:
 * `DropdownMenu` do Jetpack Compose), que abre preso ao botão. Sem o `@expo/ui`, abre o `ActionSheet` do app.
 * `style` posiciona o botão (o círculo e o tamanho já vêm daqui).
 */
export function MoreMenu({
  options,
  accessibilityLabel = strings.social.moreOptions,
  style,
}: {
  options: MoreMenuOption[];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);

  if (NativeMoreMenu) {
    return (
      <View style={[styles.circle, style]}>
        <NativeMoreMenu options={options} accessibilityLabel={accessibilityLabel} />
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.circle, style, pressed && styles.pressed]}
      >
        <DotsThree size={24} weight="bold" color={palette.ink900} />
      </Pressable>
      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        options={options.map(({ key, label, destructive, icon, onPress }) => ({ key, label, destructive, icon, onPress }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    backgroundColor: 'rgba(255,253,249,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
