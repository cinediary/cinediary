import Svg, { G, Path } from 'react-native-svg';

import { CANVAS, C_GLYPH_TRANSFORM, C_GROUP_TRANSFORM, C_PATH, STAR_BOX, STAR_CENTER, STAR_PATH } from './brandMark';

/**
 * O "c" da marca, na mesma posição do ícone dentro de um quadrado `size`×`size` (canvas 1024 do ícone).
 * Use junto com `starRestRect(size)` para pôr a estrela no lugar exato dela.
 */
export function BrandC({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
      <G transform={C_GROUP_TRANSFORM}>
        <Path d={C_PATH} transform={C_GLYPH_TRANSFORM} fill={color} />
      </G>
    </Svg>
  );
}

/** A estrela da marca (a mesma do ícone), num quadrado `size`. */
export function BrandStar({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_PATH} fill={color} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

/** Onde a estrela fica no ícone, para um "c" desenhado em `size`: tamanho e canto superior esquerdo. */
export function starRestRect(size: number) {
  const k = size / CANVAS;
  const box = STAR_BOX * k;
  return { size: box, left: STAR_CENTER.x * k - box / 2, top: STAR_CENTER.y * k - box / 2 };
}
