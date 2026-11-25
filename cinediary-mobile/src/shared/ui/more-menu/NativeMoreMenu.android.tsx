import { Box, DropdownMenu, DropdownMenuItem, Host, Icon, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import { DotsThree } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useColors } from '@/shared/theme';
import type { NativeMoreMenuProps } from './types';

/**
 * Android: o `DropdownMenu` do Jetpack Compose (Material 3). O menu do Compose abre preso ao elemento que fica
 * dentro dele, então um `Box` invisível do tamanho do botão serve de âncora, por trás do "⋯" do React Native.
 * O toque é do `Pressable`; o `Host` não recebe toques, e o menu abre numa janela própria por cima de tudo.
 */
export function NativeMoreMenu({ options, accessibilityLabel }: NativeMoreMenuProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
    >
      <Host pointerEvents="none" style={StyleSheet.absoluteFill}>
        <DropdownMenu expanded={open} onDismissRequest={close} color={colors.surface} modifiers={[fillMaxSize()]}>
          <DropdownMenu.Trigger>
            <Box modifiers={[fillMaxSize()]} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {options.map((o) => {
              const color = o.destructive ? colors.danger : colors.ink900;
              return (
                <DropdownMenuItem
                  key={o.key}
                  onClick={() => {
                    close();
                    o.onPress();
                  }}
                  elementColors={{ textColor: color, leadingIconColor: color }}
                >
                  <DropdownMenuItem.Text>
                    <Text>{o.label}</Text>
                  </DropdownMenuItem.Text>
                  {o.androidIcon != null ? (
                    <DropdownMenuItem.LeadingIcon>
                      <Icon source={o.androidIcon} size={20} />
                    </DropdownMenuItem.LeadingIcon>
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
      <DotsThree size={24} weight="bold" color={colors.ink900} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
