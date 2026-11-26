import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { Check, Plus, X } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { MyTitlesShortcuts } from '@/features/diary/presentation/components/MyTitlesShortcuts';
import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { space, touch, makeStyles, useColors } from '@/shared/theme';
import { Screen, Title, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useEditListItems, useList } from '../../application/listsQueries';

/**
 * Adicionar títulos de dentro da lista (só o dono), numa folha por cima dela: antes de digitar, os seus favoritos e
 * os vistos por último (como na escolha da capa) e os populares; ao digitar, os resultados. O + vira ✓ na hora (otimista) e dá para adicionar vários seguidos; tocar no ✓ tira.
 * Sem teclado ao abrir, como na lista de vocês do Match: dá para navegar e só digitar se quiser.
 */
export function AddTitlesToListScreen() {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.lists;
  const toast = useToast();
  const { listId = '' } = useLocalSearchParams<{ listId: string }>();
  const list = useList(listId);
  const { add, remove } = useEditListItems(listId);
  const inList = (titleId: number) => (list.data?.items ?? []).some((i) => i.title.id === titleId);

  const toggle = (title: TitleSummary) => {
    void Haptics.selectionAsync();
    const failed = () => toast(t.toggleError);
    if (inList(title.id)) remove.mutate(title.id, { onError: failed });
    else add.mutate(title, { onError: failed });
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Title parts={t.addTitlesTo(list.data?.name ?? '')} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
          onPress={() => nav.back()}
          style={styles.close}
        >
          <X size={22} color={colors.ink900} />
        </Pressable>
      </View>
      <CatalogSearchPanel
        context="list_add"
        placeholder={t.addSearch}
        onOpen={toggle}
        onAction={toggle}
        actionIcon={<Plus size={22} weight="bold" color={colors.primary} />}
        activeActionIcon={<Check size={22} weight="bold" color={colors.primary} />}
        isActionActive={(title) => inList(title.id)}
        actionLabel={(title) => (inList(title.id) ? t.removeOne(title.title) : t.addOne(title.title))}
        // Antes de digitar: os seus favoritos e os vistos por último, com ✓ nos que já estão na lista.
        idleHeader={
          <MyTitlesShortcuts
            onPick={toggle}
            isSelected={(title) => inList(title.id)}
            labelFor={(title) => (inList(title.id) ? t.removeOne(title.title) : t.addOne(title.title))}
          />
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flex: { flex: 1 },
  close: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSunken,
  },
}));
