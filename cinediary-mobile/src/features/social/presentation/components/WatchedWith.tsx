import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { openQuickLog } from '@/features/catalog/presentation/navigation';
import { useTitleEntries } from '@/features/diary/application/diaryQueries';
import type { DiaryEntry } from '@/features/diary/domain/diary';
import { strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { Avatar, Button, Text } from '@/shared/ui';
import { useEntryCompanions, useRespondToCompanion } from '../../application/companionQueries';
import type { Actor } from '../../domain/social';

/**
 * "Com Ana e Bia" na tela do registro (só quem aceitou; o dono vê também quem ainda não respondeu, com
 * "Esperando"). Se você foi marcado: Aceitar e Recusar; depois de aceitar, "Registrar no meu diário" (com a data
 * deste registro; some se você já registrou o título nesse dia) e "Tirar minha marcação".
 */
export function WatchedWith({
  entry,
  ownEntry,
  owner,
  trailing,
}: {
  entry: DiaryEntry;
  ownEntry: boolean;
  /** Dono do registro (quem marcou). */
  owner: Actor;
  /** No fim da linha do "Com…" (ex.: o botão dos Stories num registro sem review). Sem marcações, fica sozinho. */
  trailing?: ReactNode;
}) {
  const t = strings.social.companions;
  const entryId = entry.id;
  const companions = useEntryCompanions(entryId);
  const respond = useRespondToCompanion(entryId);
  const meId = useMe().data?.id;
  const mineAccepted = companions.data?.myStatus === 'ACCEPTED';
  const myEntries = useTitleEntries(mineAccepted && !ownEntry ? entry.title.id : 0);
  const alreadyLogged = (myEntries.data ?? []).some((e) => e.watchedDate === entry.watchedDate);
  const logToMyDiary = () =>
    openQuickLog(entry.title, {
      from: 'watched_with',
      date: entry.watchedDate ?? undefined,
      fromEntry: entry.id,
      markedBy: owner,
      season: entry.scope?.season,
      episode: entry.scope?.episode,
    });
  const list = companions.data?.companions ?? [];
  const mine = companions.data?.myStatus ?? null;
  if (list.length === 0 && mine !== 'PENDING') return trailing ?? null;

  const accepted = list.filter((c) => c.status === 'ACCEPTED');
  const pending = ownEntry ? list.filter((c) => c.status !== 'ACCEPTED') : [];
  // Você marcado no registro de alguém: "Com você e Bia" (você primeiro); quem não está marcado vê os nomes.
  const isMe = (c: { id: string }) => c.id === meId;
  const name = (c: { id: string; displayName: string; username: string }) => (isMe(c) ? t.you : c.displayName || c.username);
  const youFirst = <T extends { id: string }>(people: T[]) => [...people.filter(isMe), ...people.filter((c) => !isMe(c))];

  return (
    <View style={styles.root}>
      {list.length > 0 ? (
        <View style={styles.row}>
          <View style={styles.avatars}>
            {youFirst(list).slice(0, 3).map((c, i) => (
              <View key={c.id} style={[styles.avatar, i > 0 && styles.overlap, c.status !== 'ACCEPTED' && styles.faded]}>
                <Avatar name={name(c)} imageUrl={c.avatarUrl} size={28} />
              </View>
            ))}
          </View>
          <Text style={styles.flex}>
            {accepted.length > 0 ? (
              <Text variant="bodyStrong">{t.withNames(t.names(youFirst(accepted).map(name)))}</Text>
            ) : null}
            {pending.length > 0 ? (
              <Text tone="muted">
                {accepted.length > 0 ? ' · ' : ''}
                {t.pending}: {t.names(pending.map(name))}
              </Text>
            ) : null}
          </Text>
          {trailing}
        </View>
      ) : (
        trailing
      )}

      {mine === 'PENDING' ? (
        <View style={styles.ask}>
          <Text tone="secondary">{t.markedYou(owner.displayName || owner.username)}</Text>
          {/* Os dois do mesmo tamanho, lado a lado: Aceitar cheio, Recusar com contorno. */}
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <Button
                label={t.accept}
                size="sm"
                loading={respond.isPending && respond.variables === 'accept'}
                disabled={respond.isPending}
                onPress={() => respond.mutate('accept')}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t.decline}
                size="sm"
                variant="secondary"
                disabled={respond.isPending}
                onPress={() => respond.mutate('decline')}
              />
            </View>
          </View>
        </View>
      ) : mine === 'ACCEPTED' ? (
        // Aceito: o botão principal ocupa a largura; "Tirar minha marcação" é só um link discreto embaixo.
        <View style={styles.accepted}>
          {!alreadyLogged && !myEntries.isPending ? <Button label={t.logToMyDiary} size="sm" onPress={logToMyDiary} /> : null}
          <Pressable
            accessibilityRole="button"
            disabled={respond.isPending}
            onPress={() => respond.mutate('remove')}
            hitSlop={8}
            style={({ pressed }) => [styles.link, (pressed || respond.isPending) && styles.dim]}
          >
            <Text variant="caption" tone="secondary">
              {t.remove}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  // As fotos e o "Com…" bem juntos (antes 12; ficava longe demais).
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  avatars: { flexDirection: 'row' },
  avatar: { borderRadius: 16, borderWidth: 2, borderColor: palette.bg },
  overlap: { marginLeft: -10 },
  faded: { opacity: 0.5 },
  ask: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: palette.surfaceSunken },
  buttons: { flexDirection: 'row', gap: space.sm },
  accepted: { gap: space.sm },
  link: { alignSelf: 'center', paddingVertical: space.xs },
  dim: { opacity: 0.5 },
});
