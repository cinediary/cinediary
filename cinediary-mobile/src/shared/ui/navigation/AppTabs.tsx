import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { strings } from '@/shared/i18n';
import { useColors, type Colors } from '@/shared/theme';

/**
 * Barra de abas nativa (UX-01 §7.1, v1.2) — 5 abas na mesma barra.
 * - iOS 27/26: UITabBar com Liquid Glass. Sem cor de fundo (o vidro precisa do conteúdo por trás),
 *   sem role="search" (Buscar é uma aba comum) e sem aba "prominent". iOS 18–25: barra translúcida.
 * - Android: Material 3 com rótulos sempre visíveis (com 5 itens ele esconderia os inativos).
 * Rótulos seguem o idioma do aparelho (shared/i18n).
 */
const platformAppearance = (c: Colors) =>
  Platform.OS === 'android'
    ? {
        backgroundColor: c.surface,
        indicatorColor: c.terracota100,
        rippleColor: c.terracota100,
        labelVisibilityMode: 'labeled' as const,
        iconColor: { default: c.ink500, selected: c.terracota700 },
      }
    : {
        minimizeBehavior: 'onScrollDown' as const,
        iconColor: { default: c.ink500, selected: c.primary },
      };

export function AppTabs() {
  const colors = useColors();
  const t = strings.tabs;
  return (
    <NativeTabs
      tintColor={colors.primary}
      labelStyle={{ default: { color: colors.ink500 }, selected: { color: colors.ink900 } }}
      {...platformAppearance(colors)}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{t.home}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>{t.search}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
        <NativeTabs.Trigger.Label>{t.log}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="together">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Label>{t.together}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        <NativeTabs.Trigger.Label>{t.profile}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
