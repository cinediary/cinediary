import { strings } from '@/shared/i18n';
import { useToast } from '@/shared/ui';
import { useCompleteOnboarding } from '../../application/useOnboarding';

/**
 * Envia o onboarding. A navegação não é feita aqui: concluir o onboarding atualiza o /me em cache e o
 * RootNavigator troca (onboarding) por (tabs) sozinho (com Match ativado pelo convite, abre o Story).
 * Antes havia um router.replace('/(tabs)') aqui, que rodava antes do guard liberar a rota.
 */
export function useFinishOnboarding() {
  const complete = useCompleteOnboarding();
  const toast = useToast();

  const finish = () =>
    complete.mutate(undefined, {
      onSuccess: ({ activatedMatchId }) => {
        if (!activatedMatchId) toast(strings.onboarding.welcomeToast);
      },
      onError: () => toast(strings.onboarding.submitError),
    });

  return { finish, isPending: complete.isPending };
}
