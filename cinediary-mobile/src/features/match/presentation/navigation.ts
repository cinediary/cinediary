import { router, useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { useCallback } from 'react';

export const openMatch = (matchId: string) => router.push({ pathname: '/match/[matchId]', params: { matchId } });
export const openStory = (matchId: string) => router.push({ pathname: '/match/[matchId]/story', params: { matchId } });
export const openAddToShared = (matchId: string) => router.push({ pathname: '/match/[matchId]/add', params: { matchId } });
/** MA-04 · Entrar num Match pelo código: a mesma tela do link (aceita, "Calculando" e abre o Story). */
export const openInvite = (code: string) => router.push({ pathname: '/match/invite/[code]', params: { code } });

/** Nome da rota da sala no Stack raiz (o mesmo do Stack.Screen no RootNavigator). */
const ROOM_ROUTE = 'match/[matchId]/index';

/**
 * Fecha o Story (modal de tela cheia) revelando a sala do Match por baixo, numa animação só.
 * 1. coloca a sala na pilha logo abaixo da tela atual (mudança fora do topo: sem animação);
 * 2. volta: o modal some com o fade dele e a sala já está lá.
 * Antes era replace/back + push, duas animações nativas ao mesmo tempo, e a tela dava um tranco.
 */
export function useRevealRoom() {
  const navigation = useNavigation();
  return useCallback(
    (matchId: string) => {
      try {
        const state = navigation.getState();
        if (!state) throw new Error('sem estado de navegação');
        const top = state.routes[state.routes.length - 1];
        const routes = [...state.routes.slice(0, -1), { name: ROOM_ROUTE, params: { matchId } }, top];
        navigation.dispatch(
          CommonActions.reset({ ...state, routes, index: routes.length - 1 } as Parameters<typeof CommonActions.reset>[0]),
        );
        requestAnimationFrame(() => navigation.goBack());
      } catch {
        router.replace({ pathname: '/match/[matchId]', params: { matchId } });
      }
    },
    [navigation],
  );
}
