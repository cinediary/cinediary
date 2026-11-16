import { UsersThree } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { useRecents } from '@/shared/storage/useRecents';
import { Avatar, ErrorState, RecentList, SearchField, SkeletonRows, Text } from '@/shared/ui';
import { usePeopleSearch } from '../../application/socialQueries';
import type { Person } from '../../domain/social';
import { openProfile } from '../navigation';
import { PersonRow } from './PersonRow';

/** Busca de pessoas (aba Buscar → "Pessoas"): por @ ou nome, com o botão de seguir em cada uma. */
export function PeopleSearchPanel({ recentsScope = null }: { recentsScope?: string | null }) {
  const s = strings.social;
  const [query, setQuery] = useState('');
  const search = usePeopleSearch(query);
  const people = search.data ?? [];
  // Guarda só o necessário para a linha (a relação muda; o perfil aberto busca a atual).
  const recents = useRecents<Pick<Person, 'id' | 'username' | 'displayName' | 'avatarUrl'>>(recentsScope, (p) => p.id);

  return (
    <View style={styles.root}>
      <SearchField value={query} onChangeText={setQuery} placeholder={s.peoplePlaceholder} autoCapitalize="none" />
      {!search.enabled && query.trim().length === 0 && recents.items.length > 0 ? (
        <RecentList
          items={recents.items.map((p) => ({
            id: p.id,
            title: p.displayName || p.username,
            subtitle: `@${p.username}`,
            leading: <Avatar name={p.displayName || p.username} imageUrl={p.avatarUrl} size={36} />,
          }))}
          onOpen={(id) => {
            const p = recents.items.find((i) => i.id === id);
            if (!p) return;
            recents.add(p);
            openProfile(p.username, 'search');
          }}
          onRemove={recents.remove}
          onClear={recents.clear}
        />
      ) : !search.enabled ? (
        <View style={styles.hint}>
          <UsersThree size={28} color={palette.ink500} />
          <Text tone="muted" style={styles.center}>
            {s.peopleHint}
          </Text>
        </View>
      ) : search.isPending ? (
        <SkeletonRows count={4} />
      ) : search.isError ? (
        <ErrorState onRetry={() => search.refetch()} />
      ) : people.length === 0 ? (
        <Text tone="muted">{s.peopleEmpty}</Text>
      ) : (
        <View>
          {people.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              onOpen={() => recents.add({ id: p.id, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl })}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  hint: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  center: { textAlign: 'center' },
});
