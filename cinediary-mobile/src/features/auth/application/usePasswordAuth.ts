import { useClerk, useSignIn, useSignUp, useUser } from '@clerk/expo';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { pendingInvite } from '@/features/match/application/matchQueries';
import { analytics, posthogLogger } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { unregisterPushDevice } from '@/shared/notifications/push';
import { normalizeEmail, normalizeIdentifier, normalizeUsername, type SignUpInput } from '../domain/credentials';
import { clerkErrorCode } from '../infrastructure/clerkErrors';

/**
 * MVP: autenticação só com usuário + e-mail + senha, sem SSO e sem
 * verificação de e-mail. No painel do Clerk: Username e Password ligados,
 * "Verify at sign-up" desligado para e-mail.
 */
class AuthFlowError extends Error {}

function friendly(error: unknown): string {
  if (error instanceof AuthFlowError) return error.message;
  const code = clerkErrorCode(error);
  return (code && strings.auth.errors[code]) || strings.common.genericError;
}

function useAsyncAction() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(task: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setLoading(false);
    }
  }

  return { error, loading, run, clearError: () => setError(null) };
}

export function useSignInWithPassword() {
  const { signIn } = useSignIn();
  const { error, loading, run } = useAsyncAction();

  const submit = (identifier: string, password: string) =>
    run(async () => {
      const attempt = await signIn.password({ identifier: normalizeIdentifier(identifier), password });
      if (attempt.error) throw attempt.error;
      if (signIn.status !== 'complete') throw new AuthFlowError(strings.auth.signInIncomplete);
      const done = await signIn.finalize();
      if (done.error) throw done.error;
      analytics.track('user_signed_in', { auth_provider: 'password' });
      posthogLogger.info('authentication completed', { auth_action: 'sign_in', auth_provider: 'password' });
    });

  return { submit, error, loading };
}

export function useSignUpWithPassword() {
  const { signUp } = useSignUp();
  const { error, loading, run } = useAsyncAction();

  const submit = ({ username, emailAddress, password }: SignUpInput) =>
    run(async () => {
      const created = await signUp.create({
        username: normalizeUsername(username),
        emailAddress: normalizeEmail(emailAddress),
        password,
      });
      if (created.error) throw created.error;
      if (signUp.status !== 'complete') throw new AuthFlowError(strings.auth.needsVerification);
      const done = await signUp.finalize();
      if (done.error) throw done.error;
      analytics.track('user_signed_up', { auth_provider: 'password', from_invite: await pendingInvite.exists() });
      posthogLogger.info('authentication completed', { auth_action: 'sign_up', auth_provider: 'password' });
    });

  return { submit, error, loading };
}

export function useSignOut() {
  const { signOut } = useClerk();
  return async () => {
    analytics.track('user_signed_out', {});
    posthogLogger.info('authentication completed', { auth_action: 'sign_out', auth_provider: 'password' });
    // Antes de sair, ainda com a sessão: este aparelho para de receber o push da conta
    await unregisterPushDevice();
    void signOut();
  };
}

/**
 * Exclui a conta no Clerk, do mesmo jeito que o app cria a conta e entra por ele. O Clerk avisa o backend pelo
 * webhook `user.deleted`, e o backend apaga os dados da pessoa. Precisa da opção "permitir que as pessoas excluam a
 * própria conta" ligada no painel do Clerk.
 */
export function useDeleteAccount({ onError }: { onError: () => void }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sem sessão para excluir');
      await user.delete();
    },
    onSuccess: () => {
      analytics.track('account_deleted', {});
      void signOut().catch(() => undefined);
    },
    onError,
  });
}
