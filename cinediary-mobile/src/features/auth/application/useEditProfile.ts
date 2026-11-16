import { useUser } from '@clerk/expo';
import { useState } from 'react';

import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import { strings } from '@/shared/i18n';
import { normalizeEmail, normalizeUsername } from '../domain/credentials';
import { isPronounCode, type PronounCode, type ProfileChanges, type UserProfile } from '../domain/profile';

import { clerkErrorCode } from '../infrastructure/clerkErrors';
import { profileApi } from '../infrastructure/profileApi';

/** O que a tela de editar perfil manda salvar (textos como estão nos campos). */
export type ProfileForm = {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  pronouns: string;
  bio: string;
};

class EditError extends Error {}

function friendly(error: unknown): string {
  if (error instanceof EditError) return error.message;
  const code = clerkErrorCode(error);
  return (code && strings.account.errors[code]) || strings.common.genericError;
}

/** O backend devolve o perfil atualizado: a Início, o Perfil e o Match já mostram o novo na hora. */
const setMe = (profile: UserProfile) => {
  queryClient.setQueryData(sharedKeys.me, profile);
  void queryClient.invalidateQueries({ queryKey: sharedKeys.stats });
  void queryClient.invalidateQueries({ queryKey: sharedKeys.matches });
};

/**
 * Editar o perfil. O Clerk é a fonte de verdade do login (@usuário, e-mail, foto); o backend guarda o perfil
 * público (nome, @, foto). Por isso cada mudança vai PRIMEIRO para o Clerk e, dando certo, para o backend
 * (PATCH /me) na mesma hora. Não dá para esperar o webhook do Clerk: com a API local ele nem chega, e o
 * backend só aceita o @ do Clerk enquanto o dele ainda é o provisório.
 */
export function useEditProfile() {
  const { user } = useUser();
  const [busy, setBusy] = useState<null | 'profile' | 'photo' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(kind: 'profile' | 'photo' | 'email', task: () => Promise<T>): Promise<T | undefined> {
    setBusy(kind);
    setError(null);
    try {
      return await task();
    } catch (e) {
      setError(friendly(e));
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  /**
   * Nome, sobrenome, nome de exibição, @, pronomes e bio. Nome/sobrenome e @ são do Clerk (vão para ele primeiro,
   * numa chamada só); o @ é conferido antes no nosso backend. O resto é só do perfil do CineDiary.
   */
  const saveProfile = (current: UserProfile, changes: ProfileForm) =>
    run('profile', async () => {
      if (!user) throw new EditError(strings.common.genericError);
      const next = {
        username: normalizeUsername(changes.username),
        displayName: changes.displayName.trim(),
        firstName: changes.firstName.trim(),
        lastName: changes.lastName.trim(),
        pronouns: isPronounCode(changes.pronouns.trim()) ? (changes.pronouns.trim() as PronounCode) : ('' as const),
        bio: changes.bio.trim(),
      };
      const usernameChanged = next.username !== current.username;
      const namesChanged = next.firstName !== (current.firstName ?? '') || next.lastName !== (current.lastName ?? '');
      if (usernameChanged) {
        const check = await profileApi.usernameAvailability(next.username);
        if (!check.available) throw new EditError(strings.auth.usernameTaken);
      }
      if (usernameChanged || namesChanged) {
        await user.update({
          ...(usernameChanged ? { username: next.username } : {}),
          ...(namesChanged ? { firstName: next.firstName, lastName: next.lastName } : {}),
        });
      }
      const patch: ProfileChanges = {
        ...(usernameChanged ? { username: next.username } : {}),
        ...(next.displayName !== current.displayName ? { displayName: next.displayName } : {}),
        ...(namesChanged ? { firstName: next.firstName, lastName: next.lastName } : {}),
        ...(next.pronouns !== (current.pronouns ?? '') ? { pronouns: next.pronouns } : {}),
        ...(next.bio !== (current.bio ?? '') ? { bio: next.bio } : {}),
      };
      setMe(await profileApi.update(patch));
      analytics.track('profile_updated', {
        name_changed: 'displayName' in patch || namesChanged,
        username_changed: usernameChanged,
        bio_changed: 'bio' in patch,
        pronouns_changed: 'pronouns' in patch,
      });
      return true;
    });

  /** `dataUri`: "data:image/jpeg;base64,…" (o Clerk aceita a imagem assim no React Native). */
  const setPhoto = (dataUri: string, source: 'library' | 'camera') =>
    run('photo', async () => {
      if (!user) throw new EditError(strings.common.genericError);
      await user.setProfileImage({ file: dataUri });
      await user.reload();
      setMe(await profileApi.update({ avatarUrl: user.imageUrl }));
      analytics.track('profile_photo_changed', { action: 'set', source });
      return true;
    });

  const removePhoto = () =>
    run('photo', async () => {
      if (!user) throw new EditError(strings.common.genericError);
      await user.setProfileImage({ file: null });
      // String vazia = sem foto no backend (o app mostra a inicial).
      setMe(await profileApi.update({ avatarUrl: '' }));
      analytics.track('profile_photo_changed', { action: 'removed' });
      return true;
    });

  /** Passo 1 do e-mail: cria o endereço novo no Clerk e manda o código. Devolve o id para o passo 2. */
  const startEmailChange = (email: string) =>
    run('email', async () => {
      if (!user) throw new EditError(strings.common.genericError);
      const created = await user.createEmailAddress({ email: normalizeEmail(email) });
      await created.prepareVerification({ strategy: 'email_code' });
      return created.id;
    });

  /** Passo 2: confere o código, vira o e-mail principal e apaga os antigos (o login passa a ser o novo). */
  const confirmEmailChange = (emailId: string, code: string) =>
    run('email', async () => {
      if (!user) throw new EditError(strings.common.genericError);
      const address = user.emailAddresses.find((e) => e.id === emailId);
      if (!address) throw new EditError(strings.common.genericError);
      await address.attemptVerification({ code: code.trim() });
      await user.update({ primaryEmailAddressId: emailId });
      await Promise.all(user.emailAddresses.filter((e) => e.id !== emailId).map((e) => e.destroy()));
      await user.reload();
      analytics.track('email_changed', {});
      return true;
    });

  /** Desiste de um e-mail novo ainda não confirmado (não deixa um endereço solto na conta). */
  const cancelEmailChange = async (emailId: string) => {
    const address = user?.emailAddresses.find((e) => e.id === emailId);
    if (address && address.verification?.status !== 'verified') await address.destroy().catch(() => undefined);
  };

  return {
    email: user?.primaryEmailAddress?.emailAddress ?? '',
    busy,
    error,
    clearError: () => setError(null),
    saveProfile,
    setPhoto,
    removePhoto,
    startEmailChange,
    confirmEmailChange,
    cancelEmailChange,
  };
}
