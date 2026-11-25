import { MagnifyingGlass, XCircle } from 'phosphor-react-native';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { strings } from '@/shared/i18n';
import { radius, space, touch, type as typeScale, useColors, makeStyles } from '@/shared/theme';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (value: string) => void;
  /** Quando definido, o campo vira um botão que abre a busca. */
  onPressAsButton?: () => void;
}

export function SearchField({ value, onChangeText, onPressAsButton, placeholder, ...input }: SearchFieldProps) {
  const styles = useStyles();
  const colors = useColors();
  const body = (
    <View style={styles.box} pointerEvents={onPressAsButton ? 'none' : 'auto'}>
      <MagnifyingGlass size={20} color={colors.ink500} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink500}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        editable={!onPressAsButton}
        {...input}
      />
      {value.length > 0 && !onPressAsButton ? (
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} onPress={() => onChangeText('')} hitSlop={8}>
          <XCircle size={20} weight="fill" color={colors.ink400} />
        </Pressable>
      ) : null}
    </View>
  );
  if (!onPressAsButton) return body;
  return (
    <Pressable accessibilityRole="search" accessibilityLabel={placeholder} onPress={onPressAsButton}>
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.buttonHeight - 4,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
  },
  input: { ...typeScale.body, flex: 1, color: c.ink900, paddingVertical: space.sm },
}));
