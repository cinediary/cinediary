import { Check, Plus } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { strings } from '@/shared/i18n';
import { space, useColors } from '@/shared/theme';
import { Screen, Text, Title, useGridItemWidth, useToast } from '@/shared/ui';
import { FloatingBackButton, FLOATING_BACK_SPACE } from '@/shared/ui/navigation/FloatingBackButton';
import { MAX_FAVORITES, useFavorites } from '../../application/favoritesMutations';
import { SortableFavorites } from '../components/SortableFavorites';

/**
 * Editar os até 4 favoritos do perfil. Cada mudança salva na hora (otimista, ver useFavorites).
 * - Segurar e arrastar um pôster muda a ordem (SortableFavorites).
 * - O ✕ de uma vaga tira o filme; as outras andam para a esquerda.
 * - Na busca, o + adiciona na primeira vaga livre e o ✓ (já favorito) tira.
 */
export function FavoritesEditorScreen() {
  const colors = useColors();
  const t = strings.stats;
  const toast = useToast();
  const { favorites, isFavorite, isFull, setFavorites } = useFavorites();
  const slotWidth = useGridItemWidth(MAX_FAVORITES);

  const save = (next: TitleSummary[]) => setFavorites(next, { onError: () => toast(t.favoritesSaveError) });
  const remove = (title: TitleSummary) => save(favorites.filter((f) => f.id !== title.id));
  const toggle = (title: TitleSummary) => {
    if (isFavorite(title.id)) return remove(title);
    if (isFull) return toast(t.favoritesFull);
    save([...favorites, title]);
  };

  return (
    <View style={styles.root}>
      <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
        <View style={styles.header}>
          <Title parts={t.favoritesEditorTitle} />
          <Text tone="secondary">{t.favoritesEditorHint}</Text>
        </View>

        <SortableFavorites
          items={favorites}
          slots={MAX_FAVORITES}
          slotWidth={slotWidth}
          gap={space.md}
          onReorder={save}
          onRemove={remove}
        />

        <CatalogSearchPanel
          context="favorites"
          onOpen={toggle}
          onAction={toggle}
          placeholder={t.favoritesSearch}
          actionIcon={<Plus size={22} weight="bold" color={colors.primary} />}
          activeActionIcon={<Check size={22} weight="bold" color={colors.primary} />}
          isActionActive={(title) => isFavorite(title.id)}
          actionLabel={(title) => (isFavorite(title.id) ? t.favoritesRemove(title.title) : t.favoritesAdd(title.title))}
        />
      </Screen>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: FLOATING_BACK_SPACE, gap: space.xl },
  header: { gap: space.sm },
});
