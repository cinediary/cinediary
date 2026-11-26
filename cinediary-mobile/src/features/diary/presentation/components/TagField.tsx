import * as Haptics from 'expo-haptics';
import { Tag, X } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { fonts, radius, space, type as typeScale, makeStyles, useColors } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { useMyTags } from '../../application/diaryQueries';
import { addTag, normalizeTag, TAG_MAX_LENGTH, TAGS_MAX } from '../../domain/diary';

const SUGGESTIONS = 6;

/**
 * Tags do registro (#58, opção C do Design System): um campo só, com as tags virando chips dentro dele. Vírgula ou
 * enter cria, apagar com o campo vazio desfaz a última e, com o campo em foco, as suas tags aparecem embaixo,
 * filtradas pelo que se digita.
 */
export function TagField({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.diary;
  const mine = useMyTags();
  const input = useRef<TextInputInstance>(null);
  const [typed, setTyped] = useState('');
  const [focused, setFocused] = useState(false);
  const full = tags.length >= TAGS_MAX;
  const q = normalizeTag(typed);
  const suggestions = full
    ? []
    : (mine.data ?? [])
        .map((m) => m.tag)
        .filter((tag) => !tags.includes(tag) && (!q || tag.includes(q)))
        .slice(0, SUGGESTIONS);

  const add = (raw: string) => {
    const next = addTag(tags, raw);
    if (next !== tags) void Haptics.selectionAsync();
    onChange(next);
  };
  const onText = (text: string) => {
    if (!text.includes(',')) return setTyped(text);
    const parts = text.split(',');
    onChange(parts.slice(0, -1).reduce(addTag, tags));
    setTyped(parts[parts.length - 1]);
  };

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel={t.tagsRow}
        onPress={() => input.current?.focus()}
        style={[styles.box, focused && styles.boxFocused]}
      >
        <Tag size={20} color={focused ? colors.terracota700 : colors.ink500} />
        {tags.map((tag) => (
          <Animated.View key={tag} entering={FadeIn.duration(140)} exiting={FadeOut.duration(100)} style={styles.token}>
            <Text variant="caption" style={styles.tokenText}>
              {tag}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.tagRemove(tag)}
              hitSlop={10}
              onPress={() => onChange(tags.filter((x) => x !== tag))}
            >
              <X size={11} weight="bold" color={colors.terracota700} />
            </Pressable>
          </Animated.View>
        ))}
        {full ? null : (
          <TextInput
            ref={input}
            value={typed}
            onChangeText={onText}
            onSubmitEditing={() => {
              add(typed);
              setTyped('');
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && !typed && tags.length) onChange(tags.slice(0, -1));
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (typed.trim()) add(typed);
              setTyped('');
            }}
            submitBehavior="submit"
            accessibilityLabel={t.tagsRow}
            placeholder={tags.length ? '' : t.tagsRow}
            placeholderTextColor={colors.ink500}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={TAG_MAX_LENGTH}
            returnKeyType="done"
            style={styles.input}
          />
        )}
      </Pressable>
      {focused && suggestions.length > 0 ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.suggestions}>
          {suggestions.map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              onPress={() => {
                add(tag);
                setTyped('');
              }}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
            >
              <Text variant="caption" style={styles.suggestionText}>
                #{tag}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
      {full ? (
        <Text variant="caption" tone="muted">
          {t.tagsHint(TAGS_MAX, TAG_MAX_LENGTH)}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.sm },
  pressed: { opacity: 0.7 },
  box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  boxFocused: { borderColor: c.terracota500, backgroundColor: c.surface },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: c.terracota100,
  },
  tokenText: { fontFamily: fonts.bodyHeavy, color: c.terracota700 },
  input: { ...typeScale.body, flexGrow: 1, minWidth: 80, padding: 0, color: c.ink900 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  suggestion: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
  },
  suggestionText: { fontFamily: fonts.bodyHeavy, color: c.ink700 },
}));
