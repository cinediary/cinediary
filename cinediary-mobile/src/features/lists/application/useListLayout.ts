import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type ListLayout = 'rows' | 'grid';

const key = (listId: string) => `cinediary.listLayout.${listId}`;

/**
 * Linhas ou grade na tela da lista. Com ranking abre em linhas (o número e a nota importam); sem ranking, em
 * grade. Se a pessoa trocar, o app lembra a escolha daquela lista (neste aparelho).
 */
export function useListLayout(listId: string, ranked: boolean | undefined) {
  const [chosen, setChosen] = useState<ListLayout | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key(listId))
      .then((v) => {
        if (alive && (v === 'rows' || v === 'grid')) setChosen(v);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [listId]);
  const layout: ListLayout = chosen ?? (ranked === false ? 'grid' : 'rows');
  const toggle = () => {
    const next: ListLayout = layout === 'rows' ? 'grid' : 'rows';
    setChosen(next);
    void AsyncStorage.setItem(key(listId), next).catch(() => undefined);
  };
  return { layout, toggle };
}
