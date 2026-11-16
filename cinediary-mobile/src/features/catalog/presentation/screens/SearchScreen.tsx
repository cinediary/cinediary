import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

import { useMe } from '@/features/auth/application/profileQueries';
import { PeopleSearchPanel } from '@/features/social/presentation/components/PeopleSearchPanel';
import { strings } from '@/shared/i18n';
import { Screen, SegmentedControl, Text } from '@/shared/ui';
import { CatalogSearchPanel } from '../components/CatalogSearchPanel';
import { openQuickLog, openTitle } from '../navigation';

type Mode = 'titles' | 'people';

/**
 * BU-01 · Aba Buscar: filmes e séries (busca unificada, gêneros, populares; "+" abre o registro rápido) ou
 * pessoas (encontrar amigos para seguir). Trocar de aba limpa a busca; abrir um resultado não.
 */
export function SearchScreen() {
  const s = strings.social;
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'people' ? 'people' : 'titles');
  // Chegou aqui pedindo um modo (ex.: "Encontrar amigos" da Início): troca para ele.
  const [lastWanted, setLastWanted] = useState(params.mode);
  if (params.mode !== lastWanted) {
    setLastWanted(params.mode);
    if (params.mode === 'people' || params.mode === 'titles') setMode(params.mode);
  }
  // Trocou de aba: ao voltar, a busca recomeça limpa (a `key` nova remonta os painéis). Abrir um perfil ou um
  // título por cima NÃO limpa: ao voltar você ainda está na mesma busca. Antes limpava em qualquer saída de
  // foco, e abrir um resultado também tira o foco da aba.
  const navigation = useNavigation();
  const meId = useMe().data?.id;
  const [session, setSession] = useState(0);
  useEffect(
    () =>
      navigation.addListener('state', (e) => {
        const tabs = (e.data as { state?: { index: number; routes: { name: string }[] } }).state;
        const active = tabs?.routes[tabs.index]?.name;
        if (active && active !== 'search') setSession((n) => n + 1);
      }),
    [navigation],
  );

  return (
    <Screen scroll>
      <Text variant="h1" accessibilityRole="header">
        {strings.catalog.searchTitle}
      </Text>
      <SegmentedControl<Mode>
        options={[
          { value: 'titles', label: s.tabTitles },
          { value: 'people', label: s.tabPeople },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'titles' ? (
        <CatalogSearchPanel
          key={`titles-${session}`}
          context="search_tab"
          recentsScope={meId ? `titles.${meId}` : null}
          onOpen={openTitle}
          onAction={(t) => openQuickLog(t, { from: 'search' })}
        />
      ) : (
        <PeopleSearchPanel key={`people-${session}`} recentsScope={meId ? `people.${meId}` : null} />
      )}
    </Screen>
  );
}
