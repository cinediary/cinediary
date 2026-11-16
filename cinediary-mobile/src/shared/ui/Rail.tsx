import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { space } from '@/shared/theme';

/**
 * Largura de cada item, dentro da margem do conteúdo, para caberem `visible` itens: a parte inteira são
 * os itens completos e a fração é o pedaço do próximo, que avisa que dá para arrastar (3.4 = 3 inteiros
 * e 40% do 4º). Antes os pôsteres tinham largura fixa e sobrava uma tira de ~17 px do 4º: pequena
 * demais para parecer intencional, parecia erro. Agora a largura é calculada pela tela.
 */
export function useRailItemWidth(visible = 3.4, gap: number = space.md) {
  const { width } = useWindowDimensions();
  return Math.floor((width - space.screenX * 2 - gap * Math.floor(visible)) / visible);
}

/**
 * Trilho horizontal do app (pôsteres, elenco, "Continue assistindo"), dentro da margem do conteúdo:
 * - itens inteiros e um pedaço do próximo (useRailItemWidth); ao soltar, para sempre no começo de um
 *   item (snap), então nunca sobra um pôster cortado à esquerda;
 * - sem barra de rolagem.
 * `itemWidth`: a mesma largura usada nos itens, para o snap bater.
 */
export function Rail({ children, itemWidth, gap = space.md }: PropsWithChildren<{ itemWidth: number; gap?: number }>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={{ gap }}
      snapToInterval={itemWidth + gap}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ rail: { flexGrow: 0 } });
