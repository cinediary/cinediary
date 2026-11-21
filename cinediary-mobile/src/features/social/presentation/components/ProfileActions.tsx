import { GearSix, PencilSimple } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { strings } from '@/shared/i18n';
import { fonts, palette, radius, space, touch } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';

/** Botões do seu próprio perfil: "Editar perfil" (largo) e a engrenagem das Configurações. */
export function OwnProfileActions() {
  const a = strings.account;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => nav.push('/profile/edit')}
        style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
      >
        <PencilSimple size={16} weight="bold" color={palette.ink900} />
        <Text variant="bodyStrong" style={styles.editText}>
          {a.editProfile}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a.settings}
        onPress={() => nav.push('/settings')}
        style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
      >
        <GearSix size={20} color={palette.ink900} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  edit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: touch.buttonHeightSm,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
  },
  editText: { color: palette.ink900, fontFamily: fonts.bodyHeavy },
  gear: {
    width: touch.buttonHeightSm,
    height: touch.buttonHeightSm,
    borderRadius: touch.buttonHeightSm / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
  },
  pressed: { opacity: 0.7 },
});
