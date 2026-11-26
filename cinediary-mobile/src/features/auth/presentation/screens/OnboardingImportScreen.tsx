import { ImportScreen } from '@/features/importing/presentation/screens/ImportScreen';
import { useOnboardingDraft } from '../../application/useOnboarding';
import { useFinishOnboarding } from '../components/useFinishOnboarding';

/**
 * A importação do Letterboxd dentro do onboarding. Ao confirmar, passa pela tela de notificações e conclui o
 * onboarding (o guard troca para as abas, já com o diário importado); depois de salvo, limpa a importação guardada
 * no aparelho.
 */
export function OnboardingImportScreen() {
  const { setImportedFromLetterboxd } = useOnboardingDraft();
  const { next, isPending } = useFinishOnboarding();

  return (
    <ImportScreen
      onboarding={{
        finishing: isPending,
        onDone: (cleanup) => {
          setImportedFromLetterboxd();
          next(() => void cleanup());
        },
      }}
    />
  );
}
