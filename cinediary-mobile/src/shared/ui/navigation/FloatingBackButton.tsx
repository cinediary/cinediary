import { router } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, space, touch } from '@/shared/theme';

/**
 * Voltar flutuante, fixo no canto da tela (não rola junto com o conteúdo). Usado nas telas sem
 * cabeçalho nativo (título, pessoa): antes o botão ficava no topo do conteúdo e, depois de rolar
 * (ex.: todas as temporadas abertas), era preciso subir até o começo para voltar.
 * Renderize como último filho da tela, por cima do ScrollView.
 */
export function FloatingBackButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.common.back}
      // Sem tela para voltar (ex.: abriu pelo link com o app fechado), vai para o Início.
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      style={({ pressed }) => [styles.back, { top: insets.top + space.sm }, pressed && styles.pressed]}
    >
      <CaretLeft size={22} color={palette.ink900} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: space.screenX,
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    backgroundColor: 'rgba(255,253,249,0.92)',
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
});
