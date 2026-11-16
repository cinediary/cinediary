import { Stack } from 'expo-router';

import { semantic } from '@/shared/theme';

// "genres" é o index do grupo: quando o guard libera o onboarding, o Expo Router manda para "/", e sem
// um index aqui caía em "Unmatched route" (o (auth) e o (tabs) têm index; este grupo não tinha).
export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: semantic.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="seen" />
      <Stack.Screen name="favorites" />
    </Stack>
  );
}
