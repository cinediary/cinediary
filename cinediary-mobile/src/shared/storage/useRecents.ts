import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';

const MAX = 10;
const storageKey = (scope: string) => `cinediary.recents.${scope}`;
const queryKey = (scope: string) => ['recents', scope] as const;

async function read<T>(scope: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(scope: string, items: T[]) {
  queryClient.setQueryData(queryKey(scope), items);
  void AsyncStorage.setItem(storageKey(scope), JSON.stringify(items)).catch(() => undefined);
}

/**
 * Itens abertos recentemente (buscas recentes), guardados só neste aparelho. O mais novo vem primeiro, sem
 * repetir, até 10. {@code scope} separa o tipo e a conta (ex.: "titles.<userId>"), para quem divide o
 * celular não ver as buscas do outro. O cache do TanStack deixa todas as telas iguais na hora.
 */
export function useRecents<T>(scope: string | null, idOf: (item: T) => string) {
  const key = scope ?? 'none';
  const query = useQuery({ queryKey: queryKey(key), queryFn: () => read<T>(key), enabled: !!scope, staleTime: Infinity });
  const items = query.data ?? [];
  const current = () => queryClient.getQueryData<T[]>(queryKey(key)) ?? items;

  return {
    items,
    add: (item: T) => {
      if (!scope) return;
      const id = idOf(item);
      write(key, [item, ...current().filter((i) => idOf(i) !== id)].slice(0, MAX));
    },
    remove: (id: string) =>
      scope &&
      write(
        key,
        current().filter((i) => idOf(i) !== id),
      ),
    clear: () => scope && write(key, []),
  };
}
