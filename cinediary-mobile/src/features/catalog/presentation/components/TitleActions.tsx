import { BookmarkSimple, Check, Heart, Medal, Play } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { useFavorites } from '@/features/auth/application/favoritesMutations';
import { useUpdateTitleState } from '@/features/diary/application/titleStateMutations';
import { strings } from '@/shared/i18n';
import { space, useColors } from '@/shared/theme';
import { Chip, IconButton, useToast } from '@/shared/ui';
import type { SeriesStatus, TitleDetail } from '../../domain/title';
import type { TrailerSlot } from '../trailerPlacement';

const STATUSES: SeriesStatus[] = ['WATCHING', 'COMPLETED', 'DROPPED'];

/**
 * Fila de ações independentes (assistido/status, curtir, watchlist, favorito). A nota saiu daqui: ela é dada no
 * Registrar (a página mostra a nota do público e, pequena, a sua).
 * Cada toque grava na hora com UI otimista. Favorito = uma das 4 vagas do perfil (PATCH /me):
 * com as 4 ocupadas, pergunta qual sai, e o novo entra no lugar dele.
 */
export function TitleActions({ title, trailer }: { title: TitleDetail; trailer?: TrailerSlot }) {
  const colors = useColors();
  const t = strings.catalog;
  const toast = useToast();
  const update = useUpdateTitleState(title);
  const s = title.state;
  const isSeries = title.mediaType === 'SERIES';
  const fav = useFavorites();
  const favorite = fav.isFavorite(title.id);

  // Otimista: o aviso sai na hora; se o servidor recusar, o favorito volta e aparece o erro.
  const saveFavorites = (next: typeof fav.favorites, message: string) => {
    fav.setFavorites(next, { onError: () => toast(t.favoriteSaveError) });
    toast(message);
  };

  const toggleFavorite = () => {
    if (favorite)
      return saveFavorites(
        fav.favorites.filter((f) => f.id !== title.id),
        t.favoriteRemoved,
      );
    if (!fav.isFull) return saveFavorites([...fav.favorites, title], t.favoriteAdded);
    Alert.alert(t.favoritesFullTitle, t.favoritesFullText(title.title), [
      ...fav.favorites.map((f) => ({
        text: f.title,
        onPress: () =>
          saveFavorites(
            fav.favorites.map((x) => (x.id === f.id ? title : x)),
            t.favoriteAdded,
          ),
      })),
      { text: strings.common.cancel, style: 'cancel' as const },
    ]);
  };

  const save = (change: Parameters<typeof update.mutate>[0]) =>
    update.mutate(change, {
      onError: () => toast(t.saveError, { actionLabel: strings.common.retry, onAction: () => update.mutate(change) }),
    });

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {!isSeries && (
          <Slot>
            <IconButton
              label={t.watched}
              accessibilityLabel={t.watched}
              active={s.watched}
              variant="filled"
              icon={<Check size={22} weight={s.watched ? 'bold' : 'regular'} color={s.watched ? colors.watched : colors.ink700} />}
              onPress={() => save({ watched: !s.watched })}
            />
          </Slot>
        )}
        <Slot>
          <IconButton
            label={s.liked ? t.liked : t.like}
            accessibilityLabel={s.liked ? t.liked : t.like}
            active={s.liked}
            variant="filled"
            icon={<Heart size={22} weight={s.liked ? 'fill' : 'regular'} color={s.liked ? colors.liked : colors.ink700} />}
            onPress={() => save({ liked: !s.liked })}
          />
        </Slot>
        <Slot>
          <IconButton
            label={s.inWatchlist ? t.inWatchlist : t.watchlist}
            accessibilityLabel={s.inWatchlist ? t.inWatchlist : t.watchlist}
            active={s.inWatchlist}
            variant="filled"
            icon={<BookmarkSimple size={22} weight={s.inWatchlist ? 'fill' : 'regular'} color={colors.ink700} />}
            onPress={() => save({ inWatchlist: !s.inWatchlist })}
          />
        </Slot>
        <Slot>
          <IconButton
            label={favorite ? t.favorited : t.favorite}
            accessibilityLabel={favorite ? t.favorited : t.favorite}
            active={favorite}
            variant="filled"
            icon={<Medal size={22} weight={favorite ? 'fill' : 'regular'} color={favorite ? colors.primary : colors.ink700} />}
            onPress={toggleFavorite}
          />
        </Slot>
        {/* O trailer vem com o detalhe, então o botão já nasce aceso (ou nem aparece). Só num título ainda não
            conferido o lugar fica apagado até os extras chegarem. */}
        {trailer && trailer.status !== 'none' ? (
          <Slot exiting>
            <IconButton
              label={t.trailer}
              accessibilityLabel={t.trailerPlay(title.title)}
              variant="filled"
              disabled={trailer.status === 'loading'}
              icon={<Play size={22} weight="fill" color={colors.ink700} />}
              onPress={trailer.onPress}
            />
          </Slot>
        ) : null}
      </View>

      {isSeries && (
        <View style={styles.statuses}>
          {STATUSES.map((st) => (
            <Chip
              key={st}
              role="radio"
              label={t.seriesStatus[st]}
              accent={st === 'COMPLETED' ? 'salvia' : st === 'DROPPED' ? 'rosa' : 'terracota'}
              selected={s.seriesStatus === st}
              onToggle={() => save({ seriesStatus: st })}
              fill
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Uma posição da fila (todas com a mesma largura). Sem animação de layout: ela fazia os botões "flutuarem"
 * até o lugar sempre que o conteúdo de cima mudava de altura ao carregar. Só o trailer some com um fade,
 * no caso raro de um título ainda não conferido que acaba sem trailer.
 */
function Slot({ children, exiting = false }: { children: ReactNode; exiting?: boolean }) {
  return (
    <Animated.View style={styles.slot} exiting={exiting ? FadeOut.duration(150) : undefined}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  root: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm },
  statuses: { flexDirection: 'row', gap: space.sm },
});
