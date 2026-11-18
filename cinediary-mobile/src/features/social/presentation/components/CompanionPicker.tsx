import { CheckCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, semantic, space } from '@/shared/theme';
import { Avatar, SearchField, Skeleton, Text, useToast } from '@/shared/ui';
import { useFriends } from '../../application/companionQueries';
import type { Actor } from '../../domain/social';

const MAX = 10;
const VISIBLE = 6;

/**
 * "Vi com…": escolher amigos (quem você segue e te segue) para marcar no registro. Busca pelo @ ou pelo nome;
 * os já escolhidos ficam no topo, com o check. Até 10 pessoas.
 */
export function CompanionPicker({ selected, onChange }: { selected: Actor[]; onChange: (next: Actor[]) => void }) {
  const t = strings.social.companions;
  const toast = useToast();
  const [query, setQuery] = useState('');
  const friends = useFriends(query);
  const isSelected = (p: Actor) => selected.some((s) => s.username === p.username);
  const q = query.trim().replace(/^@/, '').toLowerCase();
  const matches = (p: Actor) => !q || p.username.toLowerCase().startsWith(q) || p.displayName.toLowerCase().startsWith(q);
  // Os escolhidos primeiro (os que batem com a busca), depois os amigos ainda não escolhidos.
  const rows = [...selected.filter(matches), ...(friends.data ?? []).filter((p) => !isSelected(p))].slice(0, VISIBLE + selected.length);

  const toggle = (p: Actor) => {
    if (isSelected(p)) onChange(selected.filter((s) => s.username !== p.username));
    else if (selected.length >= MAX) toast(t.max);
    else onChange([...selected, p]);
  };

  return (
    <View style={styles.root}>
      <SearchField value={query} onChangeText={setQuery} placeholder={t.search} autoCapitalize="none" />
      {friends.isPending && rows.length === 0 ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton width={32} height={32} round />
              <Skeleton width="50%" height={14} />
            </View>
          ))}
        </View>
      ) : rows.length === 0 ? (
        <Text variant="caption" tone="muted">
          {q ? t.noResults : t.onlyFriends}
        </Text>
      ) : (
        <View style={styles.list}>
          {rows.map((p) => {
            const on = isSelected(p);
            return (
              <Pressable
                key={p.username}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={p.displayName || p.username}
                onPress={() => toggle(p)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Avatar name={p.displayName || p.username} imageUrl={p.avatarUrl} size={32} />
                <View style={styles.texts}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {p.displayName || p.username}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    @{p.username}
                  </Text>
                </View>
                {on ? (
                  <CheckCircle size={24} weight="fill" color={semantic.primary} />
                ) : (
                  <View style={styles.unchecked} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  list: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  texts: { flex: 1 },
  pressed: { opacity: 0.7 },
  // O mesmo tamanho do check, vazio.
  unchecked: { width: 22, height: 22, margin: 1, borderRadius: 11, borderWidth: 1.5, borderColor: palette.ink500 },
});
