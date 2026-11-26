import { strings } from '@/shared/i18n';
import { usePushPermission } from '@/shared/notifications/usePushPermission';
import { useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useCompleteOnboarding } from '../../application/useOnboarding';

/**
 * O que concluir o onboarding ainda precisa fazer depois de salvo (ex.: limpar a importação do Letterboxd),
 * guardado enquanto a pessoa passa pela tela de notificações.
 */
let pendingAfterSuccess: (() => void) | undefined;

/**
 * Envia o onboarding. A navegação não é feita aqui: concluir o onboarding atualiza o /me em cache e o
 * RootNavigator troca (onboarding) por (tabs) sozinho (com Match ativado pelo convite, abre o Story).
 * Antes havia um router.replace('/(tabs)') aqui, que rodava antes do guard liberar a rota.
 */
export function useFinishOnboarding() {
  const complete = useCompleteOnboarding();
  const toast = useToast();
  const permission = usePushPermission();
  // Ainda dá para pedir (ou não deu tempo de saber): passa pela tela de notificações, que confere de novo
  const asksNotifications = permission.data !== 'granted' && permission.data !== 'blocked';

  /** `afterSuccess`: o que mais fazer quando o onboarding foi salvo (ex.: limpar a importação concluída). */
  const finish = (afterSuccess?: () => void) =>
    complete.mutate(undefined, {
      onSuccess: ({ activatedMatchId }) => {
        afterSuccess?.();
        if (!activatedMatchId) toast(strings.onboarding.welcomeToast);
      },
      onError: () => toast(strings.onboarding.submitError),
    });

  /**
   * O fim de cada caminho do onboarding (importou do Letterboxd, ou gêneros → já viu → favoritos): antes de
   * concluir, a tela de notificações, se a permissão ainda não foi decidida (#14).
   */
  const next = (afterSuccess?: () => void) => {
    if (!asksNotifications) return finish(afterSuccess);
    pendingAfterSuccess = afterSuccess;
    nav.push('/(onboarding)/notifications');
  };

  /** Na tela de notificações: conclui com o que o caminho deixou para depois. */
  const finishPending = () => {
    const afterSuccess = pendingAfterSuccess;
    finish(() => {
      pendingAfterSuccess = undefined;
      afterSuccess?.();
    });
  };

  return { finish, next, finishPending, asksNotifications, isPending: complete.isPending };
}
