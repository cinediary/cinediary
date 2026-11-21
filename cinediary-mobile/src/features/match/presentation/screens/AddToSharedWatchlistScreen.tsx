import { useLocalSearchParams } from 'expo-router';
import { BookmarkSimple, X } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { strings } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { Screen, Title, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useAddToSharedWatchlist, useRemoveFromSharedWatchlist, useSharedWatchlist } from '../../application/matchQueries';

/**
 * Busca no modo "adicionar à watchlist de vocês" (MA-06 → "+ Adicionar").
 * - Sem teclado ao abrir: dá para navegar pelos populares e só digitar se quiser.
 * - O marcador fica preenchido nos títulos que já estão na lista de vocês, e tocar de novo tira.
 *   Antes ele não mudava (o selo da linha é o da sua watchlist pessoal, não o da lista de vocês),
 *   então não dava para saber se tinha adicionado.
 */
export function AddToSharedWatchlistScreen() {
  const t = strings.match;
  const toast = useToast();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const shared = useSharedWatchlist(matchId);
  const add = useAddToSharedWatchlist(matchId);
  const remove = useRemoveFromSharedWatchlist(matchId);
  // Resposta na hora, antes de a lista do servidor voltar.
  const [pending, setPending] = useState<Record<number, boolean>>({});

  const inShared = (titleId: number) => pending[titleId] ?? (shared.data ?? []).some((i) => i.title.id === titleId);

  const toggle = (titleId: number) => {
    const adding = !inShared(titleId);
    setPending((p) => ({ ...p, [titleId]: adding }));
    // No sucesso o valor otimista continua valendo (é o mesmo que o servidor tem); no erro, volta.
    const options = {
      onSuccess: () => toast(adding ? t.added : t.removed),
      onError: () => {
        toast(strings.common.genericError);
        setPending(({ [titleId]: _ignored, ...rest }) => rest);
      },
    };
    if (adding) add.mutate(titleId, options);
    else remove.mutate(titleId, options);
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Title parts={t.addTitle} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} onPress={() => nav.back()} style={styles.close}>
          <X size={22} color={palette.ink900} />
        </Pressable>
      </View>
      <CatalogSearchPanel
        context="shared_watchlist"
        onOpen={(title) => toggle(title.id)}
        onAction={(title) => toggle(title.id)}
        actionIcon={<BookmarkSimple size={22} weight="bold" color={semantic.primary} />}
        activeActionIcon={<BookmarkSimple size={22} weight="fill" color={semantic.primary} />}
        isActionActive={(title) => inShared(title.id)}
        actionLabel={(title) => (inShared(title.id) ? t.removeConfirm(title.title) : `${t.add}: ${title.title}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flex: { flex: 1 },
  close: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceSunken,
  },
});
