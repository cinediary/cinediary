import { CaretLeft } from 'phosphor-react-native';
import { Pressable } from 'react-native';

import { strings } from '@/shared/i18n';
import { space, touch, useColors, makeStyles } from '@/shared/theme';
import { useStableTopInset } from '../useStableTopInset';
import { nav } from './nav';

/** Distância do voltar até o topo da área segura. */
const BACK_TOP = space.sm;

/**
 * Espaço que o voltar flutuante ocupa abaixo da área segura, já com o respiro até o conteúdo. Sem isso cada tela
 * somava um valor (umas nenhum respiro) e títulos como "Seu diário" ficavam colados no botão.
 * Use direto num `Screen` (que já desconta a área segura); fora dele, use `useFloatingBackInset`.
 */
export const FLOATING_BACK_SPACE = BACK_TOP + touch.minTarget + space.lg;

/** `paddingTop` do conteúdo de uma tela que desenha por baixo da área segura e tem o voltar flutuante. */
export function useFloatingBackInset() {
  return useStableTopInset() + FLOATING_BACK_SPACE;
}

/**
 * Voltar flutuante, fixo no canto da tela (não rola junto com o conteúdo). Usado nas telas sem
 * cabeçalho nativo (título, pessoa): antes o botão ficava no topo do conteúdo e, depois de rolar
 * (ex.: todas as temporadas abertas), era preciso subir até o começo para voltar.
 * Renderize como último filho da tela, por cima do ScrollView.
 */
export function FloatingBackButton() {
  const styles = useStyles();
  const colors = useColors();
  const top = useStableTopInset();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.common.back}
      onPress={() => nav.back()}
      hitSlop={8}
      style={({ pressed }) => [styles.back, { top: top + BACK_TOP }, pressed && styles.pressed]}
    >
      <CaretLeft size={22} color={colors.ink900} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  back: {
    position: 'absolute',
    left: space.screenX,
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    // Opaco: com fundo translúcido o iOS calcula a sombra pixel a pixel (lento, e avisa no console).
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra leve para o botão continuar visível por cima de pôsteres e textos.
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: { opacity: 0.7 },
}));
