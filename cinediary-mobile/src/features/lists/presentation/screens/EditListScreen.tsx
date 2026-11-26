import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { AuthFormLayout } from '@/features/auth/presentation/components/AuthFormLayout';
import { strings } from '@/shared/i18n';
import { radius, space, type as typeScale, makeStyles, useColors } from '@/shared/theme';
import { Button, Checkbox, ErrorState, SegmentedControl, SkeletonRows, Text, TextField, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useCreateList, useDeleteList, useList, useUpdateList } from '../../application/listsQueries';
import type { ListDetail, ListVisibility } from '../../domain/list';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 1000;

/** Criar uma lista (`/lists/new`) ou editar uma sua (`/lists/[listId]/edit`). */
export function EditListScreen() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const list = useList(listId ?? '');
  if (!listId) return <ListForm />;
  if (list.isPending) {
    return (
      <AuthFormLayout title={strings.lists.editTitle} subtitle={strings.lists.formSubtitle} footer={null}>
        <SkeletonRows count={3} />
      </AuthFormLayout>
    );
  }
  if (!list.data) return <ErrorState message={strings.lists.loadError} onRetry={() => list.refetch()} />;
  return <ListForm list={list.data} />;
}

/**
 * O formulário: nome, descrição, com ou sem ranking e quem vê. Criar leva direto para a lista nova; salvar a
 * edição volta para a lista. Excluir pede confirmação.
 */
function ListForm({ list }: { list?: ListDetail }) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.lists;
  const toast = useToast();
  const create = useCreateList();
  const update = useUpdateList(list?.id ?? '');
  const remove = useDeleteList(list?.id ?? '');
  const [name, setName] = useState(list?.name ?? '');
  const [description, setDescription] = useState(list?.description ?? '');
  const [ranked, setRanked] = useState(list?.ranked ?? false);
  const [visibility, setVisibility] = useState<ListVisibility>(list?.visibility ?? 'PUBLIC');
  const busy = create.isPending || update.isPending || remove.isPending;

  const changed =
    !list ||
    name.trim() !== list.name ||
    description.trim() !== (list.description ?? '') ||
    ranked !== list.ranked ||
    visibility !== list.visibility;
  const canSave = name.trim().length > 0 && changed && !busy;

  const onSave = () => {
    const changes = { name: name.trim(), description: description.trim(), ranked, visibility };
    if (!list) {
      create.mutate(changes, {
        onSuccess: (created) => {
          toast(t.created);
          // A lista nova no lugar do formulário: voltar dela leva para onde a pessoa estava antes.
          nav.replace({ pathname: '/lists/[listId]', params: { listId: created.id } });
        },
        onError: () => toast(t.saveError),
      });
      return;
    }
    update.mutate(changes, {
      onSuccess: () => {
        toast(t.saved);
        nav.back();
      },
      onError: () => toast(t.saveError),
    });
  };

  const onDelete = () =>
    Alert.alert(t.deleteConfirmTitle, t.deleteConfirmText, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: t.deleteConfirm,
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: () => {
              toast(t.deleted);
              // Fecha a edição e a lista (que não existe mais) de uma vez.
              nav.dismiss(2);
            },
            onError: () => toast(t.saveError),
          }),
      },
    ]);

  return (
    <AuthFormLayout
      title={list ? t.editTitle : t.createTitle}
      subtitle={t.formSubtitle}
      footer={
        <Button
          label={list ? t.save : t.create}
          loading={create.isPending || update.isPending}
          disabled={!canSave}
          onPress={onSave}
        />
      }
    >
      <TextField
        label={t.name}
        value={name}
        onChangeText={setName}
        placeholder={t.namePlaceholder}
        maxLength={NAME_MAX}
        autoFocus={!list}
        returnKeyType="next"
      />

      <View style={styles.field}>
        <Text variant="bodyStrong" tone="secondary">
          {t.description}
        </Text>
        <TextInput
          style={styles.description}
          value={description}
          onChangeText={setDescription}
          placeholder={t.descriptionPlaceholder}
          placeholderTextColor={colors.ink500}
          accessibilityLabel={t.description}
          maxLength={DESCRIPTION_MAX}
          multiline
        />
        <Text variant="caption" tone="muted" style={styles.count}>
          {t.textCount(description.length, DESCRIPTION_MAX)}
        </Text>
      </View>

      <Checkbox label={t.ranked} hint={t.rankedHint} checked={ranked} onChange={setRanked} />

      <View style={styles.field}>
        <Text variant="bodyStrong" tone="secondary">
          {t.visibility}
        </Text>
        <SegmentedControl
          options={[
            { value: 'PUBLIC', label: t.public },
            { value: 'PRIVATE', label: t.private },
          ]}
          value={visibility}
          onChange={setVisibility}
        />
        <Text variant="caption" tone="muted">
          {visibility === 'PUBLIC' ? t.publicHint : t.privateHint}
        </Text>
      </View>

      {list ? (
        <View style={styles.danger}>
          <Button label={t.delete} variant="danger" size="sm" loading={remove.isPending} disabled={busy} onPress={onDelete} />
        </View>
      ) : null}
    </AuthFormLayout>
  );
}

const useStyles = makeStyles((c) => ({
  field: { gap: space.xs },
  description: {
    ...typeScale.body,
    minHeight: 96,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    color: c.ink900,
    textAlignVertical: 'top',
  },
  count: { textAlign: 'right' },
  danger: { alignItems: 'flex-start', paddingTop: space.md },
}));
