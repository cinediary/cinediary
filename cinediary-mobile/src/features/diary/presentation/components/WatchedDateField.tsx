import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarBlank, CaretLeft, CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { nativeLocale, parseIsoDate, relativeDayLabel, strings, toIsoDate } from '@/shared/i18n';
import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { Text } from '@/shared/ui';

const shiftDay = (iso: string, days: number) => {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/**
 * Data em que assistiu: setas de um dia para trás/frente e, tocando na data, o calendário (iOS: num pop-up por
 * cima do formulário, que fecha ao escolher um dia; Android: o diálogo nativo). Nunca passa de hoje. Usado no
 * registro rápido e na edição de uma entrada.
 */
export function WatchedDateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const t = strings.diary;
  // Sempre fechado ao abrir; só aparece quando a pessoa toca na data.
  const [showCalendar, setShowCalendar] = useState(false);
  const today = toIsoDate(new Date());
  const label = relativeDayLabel(parseIsoDate(value));

  const close = () => setShowCalendar(false);
  // Escolher um dia já fecha (no iOS, o calendário não tem botão de confirmar).
  const onPickDate = (_event: unknown, date: Date) => {
    close();
    onChange(toIsoDate(date));
  };
  const picker = (
    <DateTimePicker
      value={parseIsoDate(value)}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      maximumDate={new Date()}
      locale={nativeLocale}
      accentColor={semantic.primary}
      onValueChange={onPickDate}
      onDismiss={close}
    />
  );

  return (
    <>
      <View style={styles.dateRow} accessibilityLabel={t.date}>
        <CalendarBlank size={20} color={palette.ink700} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.earlier}
          onPress={() => onChange(shiftDay(value, -1))}
          style={styles.dayBtn}
        >
          <CaretLeft size={18} color={palette.ink700} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.pickDate}: ${label}`}
          accessibilityState={{ expanded: showCalendar }}
          onPress={() => setShowCalendar((v) => !v)}
          style={styles.dateButton}
        >
          <Text variant="bodyStrong" tone="link" style={styles.dateLabel}>
            {label}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.later}
          disabled={value >= today}
          onPress={() => onChange(shiftDay(value, 1))}
          style={[styles.dayBtn, value >= today && styles.disabled]}
        >
          <CaretRight size={18} color={palette.ink700} />
        </Pressable>
      </View>
      {Platform.OS !== 'ios' ? (
        showCalendar ? picker : null
      ) : (
        // Pop-up por cima do formulário (antes o calendário abria dentro dele e empurrava o resto para baixo).
        <Modal transparent visible={showCalendar} animationType="fade" onRequestClose={close} statusBarTranslucent>
          <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} style={styles.backdrop} onPress={close}>
            {/* O cartão não repassa o toque para o fundo (senão tocar no calendário fecharia). */}
            <Pressable style={styles.card} accessibilityViewIsModal onPress={() => {}}>
              {picker}
              <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
                <Text variant="bodyStrong" tone="link">
                  {strings.common.cancel}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.minTarget },
  dayBtn: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  dateButton: { minHeight: touch.minTarget, justifyContent: 'center', paddingHorizontal: space.sm },
  dateLabel: { minWidth: 80, textAlign: 'center', textDecorationLine: 'underline' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, backgroundColor: 'rgba(42,33,28,0.4)' },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: space.md,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: palette.surface,
  },
  cancel: { alignSelf: 'flex-end', minHeight: touch.minTarget, justifyContent: 'center', paddingHorizontal: space.md },
});
