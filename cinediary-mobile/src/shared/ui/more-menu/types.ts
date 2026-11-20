import type { ReactNode } from 'react';

export interface MoreMenuOption {
  key: string;
  label: string;
  /** Vermelho (iOS: `role="destructive"`; Android: texto e ícone na cor de perigo). */
  destructive?: boolean;
  /** Ícone no iOS: nome de um SF Symbol (ex.: 'pencil', 'trash'). */
  systemImage: string;
  /** Ícone no Android: vector drawable XML, via `require('./icone.xml')` (veja `menuIcons`). */
  androidIcon?: number;
  /** Ícone do menu do próprio app, usado quando o menu nativo não está disponível. */
  icon?: ReactNode;
  onPress: () => void;
}

export interface NativeMoreMenuProps {
  options: MoreMenuOption[];
  accessibilityLabel: string;
}
