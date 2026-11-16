import { useWindowDimensions } from 'react-native';

import { space } from '@/shared/theme';

/** Largura de cada item numa grade de N colunas (padrão UX-01: 4 colunas, gutter 12). */
export function useGridItemWidth(columns = 4, gap: number = space.md, horizontalPadding: number = space.screenX) {
  const { width } = useWindowDimensions();
  return Math.floor((width - horizontalPadding * 2 - gap * (columns - 1)) / columns);
}
