import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { palette, radius, space, type as typeScale } from '@/shared/theme';
import { Button } from './Button';
import { OverlaySheet, OverlaySheetActions } from './OverlaySheet';
import { Text } from './Text';

/**
 * Escrever ou editar um texto (uma resposta, a review) num cartão colado no teclado (OverlaySheet): um campo grande
 * que cresce com o texto até o espaço que sobra acima do teclado (e rola por dentro), o contador e Cancelar/Salvar.
 * Tocar fora não fecha, para não perder o que foi escrito: só "Cancelar" ou o voltar do Android.
 *
 * - `onSave` recebe o texto sem espaços nas pontas, e só é chamado se ele mudou.
 * - `limit`: aplica o limite enquanto digita (no lugar do `maxLength` nativo, que no Android corta um texto que já
 *   passava do limite). Acima do limite o contador fica vermelho, com `overLimitHint`.
 * - `canSave`: além de "não vazio" (ou vazio, com `allowEmpty`).
 * - `alwaysShowCount`: o contador fica sempre à vista (ex.: a review), e não só perto do limite.
 */
export function TextEditSheet({
  title,
  initialText,
  maxLength,
  placeholder,
  saveLabel = strings.common.save,
  allowEmpty = false,
  limit,
  canSave,
  overLimitHint,
  alwaysShowCount = false,
  onSave,
  onClose,
}: {
  title: string;
  initialText: string;
  maxLength: number;
  placeholder?: string;
  saveLabel?: string;
  allowEmpty?: boolean;
  limit?: (next: string, previous: string) => string;
  canSave?: (text: string) => boolean;
  overLimitHint?: string;
  alwaysShowCount?: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const trimmed = text.trim();
  const over = text.length > maxLength;
  const savable = (allowEmpty || trimmed.length > 0) && (canSave?.(text) ?? true);

  const save = () => {
    if (trimmed !== initialText.trim()) onSave(trimmed);
    onClose();
  };

  return (
    <OverlaySheet
      title={title}
      onClose={onClose}
      // O campo encolhe até caber e rola por dentro; o contador fica fixo acima dos botões, sempre à vista.
      scroll={false}
      accessory={
        // Sem `alwaysShowCount`, o contador só aparece perto do limite.
        alwaysShowCount || text.length >= Math.round(maxLength * 0.9) ? (
          <View style={styles.count}>
            <Text variant="caption" tone={over ? 'danger' : 'muted'} style={styles.number}>
              {`${formatNumber(text.length)} / ${formatNumber(maxLength)}`}
            </Text>
            {over && overLimitHint ? (
              <Text variant="caption" tone="danger">
                {overLimitHint}
              </Text>
            ) : null}
          </View>
        ) : null
      }
      footer={
        <OverlaySheetActions>
          <View style={styles.flex}>
            <Button label={strings.common.cancel} variant="secondary" onPress={onClose} fullWidth />
          </View>
          <View style={styles.flex}>
            <Button label={saveLabel} onPress={save} disabled={!savable} fullWidth />
          </View>
        </OverlaySheetActions>
      }
    >
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(next) => setText(limit ? limit(next, text) : next)}
        accessibilityLabel={title}
        placeholder={placeholder}
        placeholderTextColor={palette.ink500}
        maxLength={limit ? undefined : maxLength}
        multiline
        autoFocus
        textAlignVertical="top"
      />
    </OverlaySheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Encolhe até caber acima do teclado (o cartão limita a altura) e rola por dentro quando o texto passa disso.
  input: {
    ...typeScale.body,
    flexShrink: 1,
    minHeight: 120,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceSunken,
    color: palette.ink900,
  },
  count: { alignItems: 'flex-end', gap: space.xs },
  number: { fontVariant: ['tabular-nums'] },
});
