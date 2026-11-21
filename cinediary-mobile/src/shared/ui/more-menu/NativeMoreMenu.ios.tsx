import { Button, Host, Image, Menu, type ButtonProps } from '@expo/ui/swift-ui';
import { accessibilityLabel, background, contentShape, font, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { palette, touch } from '@/shared/theme';
import type { NativeMoreMenuProps } from './types';

/**
 * iOS: o `Menu` do SwiftUI. O próprio "⋯" é o botão do menu, então ele abre preso ao botão, com SF Symbols
 * e o destrutivo em vermelho. O círculo também é do SwiftUI: no iOS 26 o menu "brota" do botão inteiro, e um
 * círculo do React Native por trás ficaria parado enquanto só os pontinhos viram o menu.
 */
export function NativeMoreMenu({ options, accessibilityLabel: label }: NativeMoreMenuProps) {
  return (
    <Host style={StyleSheet.absoluteFill}>
      <Menu
        label={
          <Image
            systemName="ellipsis"
            color={palette.ink900}
            modifiers={[
              font({ size: 18, weight: 'bold' }),
              frame({ width: touch.minTarget, height: touch.minTarget }),
              background(palette.surface, shapes.circle()),
              // Sem isso só o desenho do ícone recebe o toque, não o círculo inteiro.
              contentShape(shapes.circle()),
            ]}
          />
        }
        modifiers={[accessibilityLabel(label)]}
      >
        {options.map((o) => (
          <Button
            key={o.key}
            label={o.label}
            systemImage={o.systemImage as ButtonProps['systemImage']}
            role={o.destructive ? 'destructive' : 'default'}
            onPress={o.onPress}
          />
        ))}
      </Menu>
    </Host>
  );
}
