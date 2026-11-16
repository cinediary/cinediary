import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, touch } from '@/shared/theme';
import { Screen } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';

/**
 * Moldura de todos os passos da importação (tela inteira, não mais modal):
 * voltar flutuante no topo, conteúdo rolando e as ações SEMPRE fixas no rodapé.
 * Antes cada passo empilhava botões no meio do conteúdo, com um "Fechar" solto no fim.
 * `centered`: passos sem rolagem (processando, concluído, erro), com o conteúdo no meio da tela.
 */
export function ImportFrame({ children, footer, centered = false }: PropsWithChildren<{ footer?: ReactNode; centered?: boolean }>) {
  return (
    <View style={styles.root}>
      <Screen scroll={!centered} edges={['top', 'bottom']} footer={footer} contentStyle={centered ? styles.centered : styles.content}>
        {children}
      </Screen>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Espaço do voltar flutuante, para o título não começar escondido atrás dele.
  content: { paddingTop: touch.minTarget + space.lg, gap: space.xl },
  centered: { justifyContent: 'center', alignItems: 'center', gap: space.lg },
});
