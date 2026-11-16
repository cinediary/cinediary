import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarBlank, CaretLeft, CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { nativeLocale, parseIsoDate, relativeDayLabel, strings, toIsoDate } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { Text } from '@/shared/ui';

const shiftDay = (iso: string, days: number) => {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

/**
 * Data em que assistiu: setas de um dia para trás/frente e, tocando na data, o calendário (iOS: inline
 * abaixo da linha; Android: o diálogo nativo). Nunca passa de hoje. Usado no registro rápido e na
 * edição de uma entrada.
 */
export function WatchedDateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const t = strings.diary;
  // Sempre fechado ao abrir; só aparece quando a pessoa toca na data.
  const [showCalendar, setShowCalendar] = useState(false);
  const today = toIsoDate(new Date());
  const label = relativeDayLabel(parseIsoDate(value));

  const onPickDate = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShowCalendar(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  };

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
      {showCalendar ? (
        <DateTimePicker
          value={parseIsoDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          locale={nativeLocale}
          accentColor={semantic.primary}
          onChange={onPickDate}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.minTarget },
  dayBtn: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  dateButton: { minHeight: touch.minTarget, justifyContent: 'center', paddingHorizontal: space.sm },
  dateLabel: { minWidth: 80, textAlign: 'center', textDecorationLine: 'underline' },
});
