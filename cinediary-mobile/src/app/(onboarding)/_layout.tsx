import { Stack } from 'expo-router';

import { semantic } from '@/shared/theme';

// A pergunta do Letterboxd é o index do grupo: quando o guard libera o onboarding, o Expo Router manda para
// "/", e sem um index aqui caía em "Unmatched route" (o (auth) e o (tabs) têm index; este grupo não tinha).
export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: semantic.background } }}>
      {/* Primeira tela: importar do Letterboxd (e terminar) ou seguir para gêneros, "já viu" e favoritos. */}
      <Stack.Screen name="index" />
      <Stack.Screen name="letterboxd-import" />
      <Stack.Screen name="genres" />
      <Stack.Screen name="seen" />
      <Stack.Screen name="favorites" />
    </Stack>
  );
}
