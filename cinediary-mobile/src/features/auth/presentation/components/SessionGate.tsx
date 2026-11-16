import { StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { semantic, space } from '@/shared/theme';
import { Button, ErrorState, LoadingState } from '@/shared/ui';
import { useSignOut } from '../../application/usePasswordAuth';

/** Enquanto o /me carrega logo após entrar ou criar conta (nunca uma tela vazia). */
export function SessionLoadingScreen() {
  return (
    <View style={styles.root}>
      <LoadingState />
    </View>
  );
}

/** O backend não respondeu ao /me: sem ele não sabemos se falta o onboarding. */
export function SessionErrorScreen({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const signOut = useSignOut();
  return (
    <View style={styles.root}>
      {retrying ? <LoadingState /> : <ErrorState message={strings.auth.sessionError} onRetry={onRetry} />}
      <Button label={strings.auth.signOut} variant="ghost" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg, backgroundColor: semantic.background },
});
