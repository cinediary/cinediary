import { Popcorn } from 'phosphor-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { strings } from '@/shared/i18n';
import { space, useColors } from '@/shared/theme';
import { Button, Card, EmptyState, ErrorState, Screen, SectionHeader, SkeletonRows, TextField, Title, useToast } from '@/shared/ui';
import { useRefetchOnFocus } from '@/shared/ui/navigation/useRefetchOnFocus';
import { useCreateMatch, useMatches } from '../../application/matchQueries';
import { parseInviteCode, type Match } from '../../domain/match';
import { InviteCreatedCard } from '../components/InviteCreatedCard';
import { MatchCard } from '../components/MatchCard';
import { openInvite } from '../navigation';

/** MA-01 · Aba Juntos: criar convite, entrar por código e lista de Matches. */
export function TogetherHubScreen() {
  const colors = useColors();
  const t = strings.match;
  const toast = useToast();
  const me = useMe();
  const matches = useMatches();
  const create = useCreateMatch();
  useRefetchOnFocus(matches.refetch);
  const [created, setCreated] = useState<Match | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const joinRef = useRef<ComponentRef<typeof View>>(null);
  const code = parseInviteCode(codeInput);

  const onCreate = () =>
    create.mutate(undefined, {
      onSuccess: setCreated,
      onError: () => toast(strings.common.genericError),
    });

  // Abre a mesma tela do link (MA-04 · Calculando): ela aceita, mostra a animação e abre o Story,
  // ou explica por que o código não serve.
  const onJoin = () => {
    if (!code) return;
    Keyboard.dismiss();
    setCodeInput('');
    openInvite(code);
  };

  // O convite recém-criado já aparece no card "Convite criado"; não repete como card pendente.
  const list = (matches.data ?? []).filter((m) => m.id !== created?.id);

  return (
    <Screen scroll onRefresh={matches.refetch} keyboardTarget={joinRef}>
      <Title parts={t.hubTitle} />

      {created ? (
        <Card>
          <InviteCreatedCard match={created} onDone={() => setCreated(null)} />
        </Card>
      ) : null}

      {matches.isPending ? (
        <SkeletonRows count={3} />
      ) : matches.isError ? (
        <ErrorState onRetry={() => matches.refetch()} />
      ) : list.length === 0 && !created ? (
        <EmptyState
          illustration={<Popcorn size={56} color={colors.terracota500} weight="duotone" />}
          title={t.emptyTitle}
          description={t.emptyText}
          actionLabel={t.create}
          onAction={onCreate}
        />
      ) : (
        <>
          <View style={styles.list}>
            {list.map((m) => (
              <MatchCard key={m.id} match={m} meId={me.data?.id} />
            ))}
          </View>
          {!created ? <Button label={t.create} loading={create.isPending} onPress={onCreate} /> : null}
        </>
      )}

      <SectionHeader title={t.haveCode} />
      <TextField
        label={t.haveCode}
        value={codeInput}
        onChangeText={setCodeInput}
        placeholder={t.codePlaceholder}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={onJoin}
      />
      {/* Botão e erro juntos: com o teclado aberto, a tela rola até os dois ficarem visíveis. */}
      <View ref={joinRef} style={styles.join}>
        <Button label={t.join} variant="secondary" disabled={!code} onPress={onJoin} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: space.md }, join: { gap: space.lg } });
