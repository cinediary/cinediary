import { CheckCircle, Eye, EyeSlash } from 'phosphor-react-native';
import { useState, type ComponentRef, type Ref } from 'react';
import { ActivityIndicator, Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { radius, space, touch, type as typeScale, useColors, makeStyles } from '@/shared/theme';
import { strings } from '@/shared/i18n';
import { Text } from './Text';

export type TextFieldRef = ComponentRef<typeof TextInput>;

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'ref'> {
  ref?: Ref<TextFieldRef>;
  label: string;
  error?: string | null;
  hint?: string;
  /** Confirmação positiva abaixo do campo (ex.: "@nome está livre"), com borda e ícone verdes. */
  success?: string | null;
  /** Verificando algo do valor (ex.: disponibilidade): um indicador no canto do campo. */
  checking?: boolean;
  /** Campo de senha com botão de mostrar/ocultar. */
  secure?: boolean;
}

export function TextField({ label, error, hint, success, checking = false, secure = false, ref, ...input }: TextFieldProps) {
  const styles = useStyles();
  const colors = useColors();
  const [hidden, setHidden] = useState(secure);
  const ok = !error && !!success;
  const helper = error ?? (ok ? success : hint);

  return (
    <View style={styles.root}>
      <Text variant="bodyStrong" tone="secondary">
        {label}
      </Text>
      <View style={[styles.box, !!error && styles.boxError, ok && styles.boxSuccess]}>
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.ink500}
          accessibilityLabel={label}
          accessibilityHint={helper ?? undefined}
          secureTextEntry={hidden}
          autoCorrect={false}
          {...input}
        />
        {checking ? (
          <ActivityIndicator style={styles.toggle} color={colors.ink500} />
        ) : ok ? (
          <View style={styles.toggle}>
            <CheckCircle size={22} weight="fill" color={colors.success} />
          </View>
        ) : null}
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? strings.auth.showPassword : strings.auth.hidePassword}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
            hitSlop={8}
          >
            {hidden ? <Eye size={22} color={colors.ink700} /> : <EyeSlash size={22} color={colors.ink700} />}
          </Pressable>
        )}
      </View>
      {helper ? (
        <Text
          variant="caption"
          tone={error ? 'danger' : ok ? 'success' : 'muted'}
          accessibilityLiveRegion={error || ok ? 'polite' : 'none'}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.buttonHeight,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  boxError: { borderColor: c.error },
  boxSuccess: { borderColor: c.success },
  input: { ...typeScale.body, flex: 1, paddingHorizontal: space.lg, color: c.ink900, minHeight: touch.buttonHeight },
  toggle: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
}));
