import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, strings } from '@/shared/i18n';
import { palette, radius, space, type as typeScale } from '@/shared/theme';
import { Button } from './Button';
import { Text } from './Text';

/**
 * Folha para editar um texto (ex.: uma resposta), colada no teclado: sobe junto com ele, com os cantos de cima
 * arredondados, um campo grande que cresce com o texto (e rola quando passa de 30% da tela), o contador perto do
 * limite e Cancelar/Salvar.
 * Não é um Modal: fica na própria tela, por cima de tudo, para acompanhar o teclado do mesmo jeito que um campo
 * fixo embaixo (num Modal o Android não acompanha). Renderize por último no container da tela.
 * Tocar fora não fecha, para não perder o que foi escrito: só "Cancelar" ou o voltar do Android.
 * `onSave` recebe o texto sem espaços nas pontas, e só é chamado se ele mudou.
 */
export function TextEditSheet({
  title,
  initialText,
  maxLength,
  placeholder,
  onSave,
  onClose,
}: {
  title: string;
  initialText: string;
  maxLength: number;
  placeholder?: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useAnimatedKeyboard();
  const [text, setText] = useState(initialText);
  const trimmed = text.trim();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const sheet = useAnimatedStyle(() => ({ paddingBottom: Math.max(keyboard.height.value, insets.bottom) + space.md }));

  const save = () => {
    if (trimmed !== initialText.trim()) onSave(trimmed);
    onClose();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={styles.backdrop}>
        {/* Bloqueia os toques na tela por trás, sem fechar. */}
        <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={() => {}} />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(260)} exiting={SlideOutDown.duration(200)} style={[styles.sheet, sheet]} accessibilityViewIsModal>
        <Text variant="h3" accessibilityRole="header">
          {title}
        </Text>
        <TextInput
          style={[styles.input, { maxHeight: Math.round(height * 0.3) }]}
          value={text}
          onChangeText={setText}
          accessibilityLabel={title}
          placeholder={placeholder}
          placeholderTextColor={palette.ink500}
          maxLength={maxLength}
          multiline
          autoFocus
          textAlignVertical="top"
        />
        {/* O contador só aparece perto do limite. */}
        {text.length >= Math.round(maxLength * 0.9) ? (
          <Text variant="caption" tone="muted" style={styles.count}>
            {`${formatNumber(text.length)} / ${formatNumber(maxLength)}`}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label={strings.common.cancel} variant="secondary" onPress={onClose} fullWidth />
          </View>
          <View style={styles.flex}>
            <Button label={strings.common.save} onPress={save} disabled={trimmed.length === 0} fullWidth />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,33,28,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.md,
    paddingTop: space.lg,
    paddingHorizontal: space.screenX,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: palette.surface,
  },
  input: {
    ...typeScale.body,
    minHeight: 120,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceSunken,
    color: palette.ink900,
  },
  count: { alignSelf: 'flex-end', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
});
