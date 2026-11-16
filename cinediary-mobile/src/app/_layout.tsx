import { RootNavigator } from '@/features/auth/presentation/navigation/RootNavigator';
import { AppProviders } from '@/shared/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
