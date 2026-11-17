import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { LetterboxdImportPreview } from '../components/LetterboxdImportPreview';
import { OnboardingFrame } from '../components/OnboardingFrame';

/**
 * Primeira tela do onboarding: "Você já registra filmes no Letterboxd?". Fora da contagem de passos:
 * - Importar: a importação de hoje, dentro do onboarding. O ZIP já traz o gosto da pessoa (histórico, notas,
 *   favoritos), então ao confirmar o onboarding termina, sem gêneros, "já viu" nem favoritos;
 * - Faço depois: o caminho de sempre, gêneros → "já viu" → favoritos. Dá para importar depois em Configurações.
 */
export function OnboardingLetterboxdScreen() {
  const t = strings.onboarding;

  const choose = (choice: 'import' | 'later') => {
    analytics.track('onboarding_import_choice', { choice });
    router.push(choice === 'import' ? '/(onboarding)/letterboxd-import' : '/(onboarding)/genres');
  };

  // Um pouco acima do rodapé padrão: sem nada no meio da tela, os botões colados embaixo ficavam longe demais.
  const footer = (
    <View style={styles.footer}>
      <Button label={t.letterboxdImport} onPress={() => choose('import')} />
      <Button label={t.letterboxdLater} variant="secondary" onPress={() => choose('later')} />
      <Text variant="caption" tone="muted" style={styles.center}>
        {t.letterboxdLaterHint}
      </Text>
    </View>
  );

  return (
    <OnboardingFrame title={t.letterboxdTitle} caption={t.letterboxdCaption} footer={footer}>
      <LetterboxdImportPreview />
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.sm, paddingBottom: space.md },
  center: { textAlign: 'center' },
});
