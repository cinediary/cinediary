import * as Haptics from 'expo-haptics';
import { Check, Plus } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { fonts, radius, space, type as typeScale, makeStyles, useColors } from '@/shared/theme';
import { Button, OverlaySheet, SkeletonRows, Text, useToast } from '@/shared/ui';
import { useCreateListWithTitle, useMyLists, useToggleInList } from '../../application/listsQueries';
import { ListCover } from './ListCover';

const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const THUMB = 44;

/**
 * "Adicionar à lista" (#22), aberta pela página do título: as suas listas, com um ✓ nas que já têm o título.
 * Tocar põe ou tira na hora (otimista; volta se o servidor recusar). Embaixo, criar uma lista nova já com o título.
 */
export function AddToListSheet({ title, onClose }: { title: TitleSummary; onClose: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.lists;
  const toast = useToast();
  const mine = useMyLists(title.id);
  const toggle = useToggleInList(title.id, title.mediaType);
  const create = useCreateListWithTitle(title.id, title.mediaType);
  const [name, setName] = useState('');

  const onToggle = (listId: string, add: boolean) => {
    void Haptics.selectionAsync();
    // O ✓ já mostra o que mudou; aviso só se der erro.
    toggle.mutate({ listId, add }, { onError: () => toast(t.toggleError) });
  };

  const onCreate = () => {
    const clean = name.trim();
    if (!clean || create.isPending) return;
    create.mutate(clean, {
      onSuccess: (list) => {
        toast(t.added(list.name));
        setName('');
      },
      onError: () => toast(t.saveError),
    });
  };

  return (
    <OverlaySheet
      title={t.sheetTitle}
      onClose={onClose}
      onBackdropPress={onClose}
      footer={<Button label={t.done} variant="secondary" onPress={onClose} />}
    >
      <View style={styles.root}>
        {mine.isPending ? (
          <SkeletonRows count={3} />
        ) : mine.data?.length ? (
          mine.data.map(({ list, containsTitle }) => (
            <Pressable
              key={list.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: containsTitle }}
              accessibilityLabel={list.name}
              onPress={() => onToggle(list.id, !containsTitle)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <ListCover posters={list.coverPosters} name={list.name} style="mosaic" width={THUMB} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {list.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {t.titlesCount(list.itemsCount)}
                </Text>
              </View>
              <View style={[styles.check, containsTitle && styles.checkOn]}>
                {containsTitle ? (
                  <Animated.View entering={ZoomIn.duration(180).easing(EASE)} exiting={FadeOut.duration(120)}>
                    <Check size={14} weight="bold" color={colors.onPrimary} />
                  </Animated.View>
                ) : null}
              </View>
            </Pressable>
          ))
        ) : (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text tone="secondary">{t.sheetEmpty}</Text>
          </Animated.View>
        )}

        {/* Nova lista já com o título: nome e "Criar e adicionar", sem sair da página do título. */}
        <View style={styles.create}>
          <View style={styles.plus}>
            <Plus size={18} weight="bold" color={colors.terracota700} />
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t.newListName}
            placeholderTextColor={colors.ink500}
            accessibilityLabel={t.newListName}
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={onCreate}
          />
        </View>
        {name.trim() ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Button label={t.createAndAdd} size="sm" loading={create.isPending} onPress={onCreate} />
          </Animated.View>
        ) : null}
      </View>
    </OverlaySheet>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.md },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  pressed: { opacity: 0.7 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: c.primary, borderColor: c.primary },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  plus: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.terracota100,
  },
  input: { ...typeScale.body, flex: 1, color: c.ink900, fontFamily: fonts.body, paddingVertical: space.sm },
}));
