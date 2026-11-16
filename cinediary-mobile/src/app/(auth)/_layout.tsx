import { Stack } from 'expo-router';

import { semantic } from '@/shared/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: semantic.background } }} />;
}
