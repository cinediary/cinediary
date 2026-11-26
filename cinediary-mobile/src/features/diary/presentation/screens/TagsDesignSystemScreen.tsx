import { Heart, Plus, Tag, X } from 'phosphor-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { fonts, radius, semantic, space, type as typeScale, makeStyles, useColors } from '@/shared/theme';
import { Button, IconButton, ListRow, PosterArt, Screen, SectionHeader, SegmentedControl, StarRating, Text, useToast } from '@/shared/ui';
import { addTag, normalizeTag } from '../../domain/diary';
import { SAMPLE_DIARY } from '../dev/sampleDiary';

type LogOption = 'row' | 'inline' | 'tokens' | 'hashtag';
type ProfileOption = 'cloud' | 'cards' | 'ranking';

const LOG_OPTIONS = [
  { value: 'row', label: 'A · Cartão' },
  { value: 'inline', label: 'B · Chips' },
  { value: 'tokens', label: 'C · Campo ✓' },
  { value: 'hashtag', label: 'D · #review' },
] as const;

const LOG_HINTS: Record<LogOption, string> = {
  row: 'Primeira versão: uma linha "Tags" que abre um cartão por cima, com o próprio "Pronto". São dois botões para a mesma tarefa e um passo a mais.',
  inline:
    'As suas tags mais usadas aparecem como chips numa linha que rola. Um toque marca ou desmarca; "+ Nova" vira um campo ali mesmo. Sem cartão e sem "Pronto".',
  tokens:
    'Um campo só, como no e-mail: o que você digita vira chip com vírgula ou enter, e o apagar desfaz o último. As sugestões filtram enquanto digita.',
  hashtag:
    'Nenhum campo novo: escreva #cinema na review e vira tag. Os chips embaixo completam a hashtag. Para quem já escreve review, é o caminho mais curto.',
};

const PROFILE_OPTIONS = [
  { value: 'cloud', label: '1 · Nuvem' },
  { value: 'cards', label: '2 · Cartões' },
  { value: 'ranking', label: '3 · Ranking' },
] as const;

const PROFILE_HINTS: Record<ProfileOption, string> = {
  cloud: 'Uma seção "Suas tags" no perfil, com as mais usadas maiores. Bate o olho e já vê do que é feito o seu diário.',
  cards: 'Cada tag vira um cartão com os pôsteres dos registros dela, como as listas. Mais visual e convida a abrir.',
  ranking: 'Uma lista com barras de uso, das mais usadas para as menos. Mostra o número de cada uma e cabe muitas tags.',
};

const MINE = ['cinema', 'com a família', 'maratona de terror', 'festival', 'chorei', 'em casa', 'sessão da tarde'];

const PROFILE_TAGS = ['cinema', 'com a família', 'maratona de terror', 'festival', 'chorei', 'em casa', 'sessão da tarde'].map(
  (name, i) => ({
    name,
    count: [18, 9, 6, 4, 3, 2, 1][i],
    posters: SAMPLE_DIARY.slice(i % 4, (i % 4) + 4).map((e) => e.title),
  }),
);

const HASHTAG = /#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;

/**
 * Design System das tags (#58), só em desenvolvimento: jeitos de marcar tags no registro rápido (sem o cartão com
 * "Pronto" da versão atual) e de ver as suas tags no perfil. Tudo funciona com dados de exemplo.
 */
export function TagsDesignSystemScreen() {
  const styles = useStyles();
  const [logOption, setLogOption] = useState<LogOption>('inline');
  const [profileOption, setProfileOption] = useState<ProfileOption>('cloud');

  return (
    <Screen scroll edges={[]}>
      <Text variant="overline" tone="secondary">
        Marcar tags no registro
      </Text>
      <SegmentedControl options={LOG_OPTIONS} value={logOption} onChange={setLogOption} />
      <Text variant="caption" tone="muted">
        {LOG_HINTS[logOption]}
      </Text>
      <QuickLogMock key={logOption} option={logOption} />

      <View style={styles.divider} />

      <Text variant="overline" tone="secondary">
        Suas tags no perfil
      </Text>
      <SegmentedControl options={PROFILE_OPTIONS} value={profileOption} onChange={setProfileOption} />
      <Text variant="caption" tone="muted">
        {PROFILE_HINTS[profileOption]}
      </Text>
      <View style={styles.device}>
        <SectionHeader title="Suas tags" actionLabel="Ver tudo" onAction={() => {}} />
        {profileOption === 'cloud' ? <TagCloud /> : profileOption === 'cards' ? <TagCards /> : <TagRanking />}
      </View>
    </Screen>
  );
}

/** O registro rápido de exemplo, só com o que importa para comparar: o topo, a nota, as tags e o "Registrar". */
function QuickLogMock({ option }: { option: LogOption }) {
  const styles = useStyles();
  const colors = useColors();
  const title = SAMPLE_DIARY[0].title;
  const [rating, setRating] = useState(4);
  const [liked, setLiked] = useState(false);
  const [tags, setTags] = useState<string[]>(['cinema']);
  const toast = useToast();

  return (
    <View style={styles.device}>
      <View style={styles.header}>
        <PosterArt title={title.title} posterUrl={title.posterUrl} width={56} />
        <View style={styles.flex}>
          <Text variant="h3" numberOfLines={2}>
            {title.title}
          </Text>
          <Text variant="caption" tone="muted">
            {title.year}
          </Text>
        </View>
        <IconButton
          label="Curtir"
          accessibilityLabel="Curtir"
          active={liked}
          variant="filled"
          icon={<Heart size={22} weight={liked ? 'fill' : 'regular'} color={liked ? semantic.liked : colors.ink700} />}
          onPress={() => setLiked((l) => !l)}
        />
      </View>
      <View style={styles.center}>
        <StarRating value={rating} onChange={setRating} />
      </View>

      {option === 'row' ? (
        <ListRow
          icon={<Tag size={20} color={colors.ink700} />}
          label="Tags"
          hint={tags.join(' · ') || undefined}
          onPress={() => toast('Abre o cartão com "Pronto" por cima do formulário')}
        />
      ) : option === 'inline' ? (
        <InlineChips tags={tags} onChange={setTags} />
      ) : option === 'tokens' ? (
        <TokenField tags={tags} onChange={setTags} />
      ) : (
        <HashtagReview onChange={setTags} />
      )}

      <Button label="Registrar" onPress={() => toast(tags.length ? `Registrado com ${tags.map((t) => `#${t}`).join(' ')}` : 'Registrado sem tags')} />
    </View>
  );
}

/** B · As suas tags como chips numa linha; um toque marca. "+ Nova" vira um campo no lugar. */
function InlineChips({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const styles = useStyles();
  const colors = useColors();
  const [adding, setAdding] = useState(false);
  const [typed, setTyped] = useState('');
  const options = [...tags, ...MINE.filter((t) => !tags.includes(t))];
  const toggle = (tag: string) => onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : addTag(tags, tag));
  const commit = () => {
    if (typed.trim()) onChange(addTag(tags, typed));
    setTyped('');
    setAdding(false);
  };

  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Tag size={18} color={colors.ink700} />
        <Text variant="bodyStrong">Tags</Text>
        <Text variant="caption" tone="muted">
          opcional
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.bleed} contentContainerStyle={styles.rail}>
        {adding ? (
          <Animated.View entering={FadeIn.duration(160)} style={[styles.pill, styles.pillInput]}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              onSubmitEditing={commit}
              onBlur={commit}
              placeholder="nova tag"
              placeholderTextColor={colors.ink500}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              autoFocus
              style={styles.inlineInput}
            />
          </Animated.View>
        ) : (
          <Pill label="Nova" icon={<Plus size={12} weight="bold" color={colors.ink700} />} dashed onPress={() => setAdding(true)} />
        )}
        {options.map((tag) => (
          <Animated.View key={tag} layout={LinearTransition.duration(200)}>
            <Pill label={`#${tag}`} selected={tags.includes(tag)} onPress={() => toggle(tag)} />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

/** C · Um campo com chips dentro: vírgula ou enter cria, apagar com o campo vazio desfaz o último. */
function TokenField({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const styles = useStyles();
  const colors = useColors();
  const [typed, setTyped] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const q = normalizeTag(typed);
  const suggestions = MINE.filter((t) => !tags.includes(t) && (!q || t.includes(q))).slice(0, 5);

  const onText = (text: string) => {
    if (!text.includes(',')) return setTyped(text);
    const parts = text.split(',');
    onChange(parts.slice(0, -1).reduce(addTag, tags));
    setTyped(parts[parts.length - 1]);
  };

  return (
    <View style={styles.block}>
      <Pressable onPress={() => input.current?.focus()} style={[styles.tokenBox, focused && styles.tokenBoxFocused]}>
        <Tag size={18} color={colors.ink500} />
        {tags.map((tag) => (
          <Animated.View key={tag} entering={FadeIn.duration(140)} exiting={FadeOut.duration(100)} style={styles.token}>
            <Text variant="caption" style={styles.tokenText}>
              {tag}
            </Text>
            <Pressable accessibilityLabel={`Remover ${tag}`} hitSlop={8} onPress={() => onChange(tags.filter((t) => t !== tag))}>
              <X size={11} weight="bold" color={colors.ink700} />
            </Pressable>
          </Animated.View>
        ))}
        <TextInput
          ref={input}
          value={typed}
          onChangeText={onText}
          onSubmitEditing={() => {
            onChange(addTag(tags, typed));
            setTyped('');
          }}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && !typed && tags.length) onChange(tags.slice(0, -1));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          submitBehavior="submit"
          placeholder={tags.length ? '' : 'Adicionar tags'}
          placeholderTextColor={colors.ink500}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          style={styles.tokenInput}
        />
      </Pressable>
      {focused && suggestions.length ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.wrap}>
          {suggestions.map((tag) => (
            <Pill key={tag} label={`#${tag}`} onPress={() => onChange(addTag(tags, tag))} />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** D · As tags saem das hashtags da review; os chips completam a hashtag no fim do texto. */
function HashtagReview({ onChange }: { onChange: (next: string[]) => void }) {
  const styles = useStyles();
  const colors = useColors();
  const [text, setText] = useState('Vi no cinema e saí sem ar. #cinema');
  const found = [...text.matchAll(HASHTAG)].map((m) => m[1]).reduce(addTag, [] as string[]);
  const update = (next: string) => {
    setText(next);
    onChange([...next.matchAll(HASHTAG)].map((m) => m[1]).reduce(addTag, [] as string[]));
  };
  const append = (tag: string) => update(`${text.trimEnd()} #${tag.replace(/\s+/g, '-')}`);

  return (
    <View style={styles.block}>
      <TextInput
        value={text}
        onChangeText={update}
        multiline
        placeholder="O que você achou? Use #tags"
        placeholderTextColor={colors.ink500}
        style={styles.review}
      />
      <View style={styles.wrap}>
        {found.map((tag) => (
          <Pill key={`f-${tag}`} label={`#${tag}`} selected />
        ))}
        {MINE.filter((t) => !found.includes(t.replace(/\s+/g, '-'))).slice(0, 4).map((tag) => (
          <Pill key={tag} label={`#${tag.replace(/\s+/g, '-')}`} icon={<Plus size={11} weight="bold" color={colors.ink700} />} onPress={() => append(tag)} />
        ))}
      </View>
    </View>
  );
}

/** 1 · Nuvem: as mais usadas maiores e mais fortes. */
function TagCloud() {
  const styles = useStyles();
  const colors = useColors();
  const toast = useToast();
  const max = PROFILE_TAGS[0].count;
  return (
    <View style={styles.wrap}>
      {PROFILE_TAGS.map((t) => {
        const weight = t.count / max;
        return (
          <Pressable
            key={t.name}
            onPress={() => toast(`Abre o diário filtrado por #${t.name}`)}
            style={({ pressed }) => [
              styles.cloudTag,
              { backgroundColor: weight > 0.45 ? colors.terracota100 : colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cloudText, { fontSize: 13 + Math.round(weight * 7) }]}>#{t.name}</Text>
            <Text variant="caption" tone="muted">
              {t.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 2 · Cartões com os pôsteres dos registros de cada tag, numa linha que rola. */
function TagCards() {
  const styles = useStyles();
  const toast = useToast();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rail}>
      {PROFILE_TAGS.slice(0, 5).map((t) => (
        <Pressable key={t.name} onPress={() => toast(`Abre o diário filtrado por #${t.name}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.mosaic}>
            {t.posters.map((p) => (
              <PosterArt key={p.id} title={p.title} posterUrl={p.posterUrl} width={66} />
            ))}
          </View>
          <Text variant="bodyStrong" numberOfLines={1}>
            #{t.name}
          </Text>
          <Text variant="caption" tone="muted">
            {t.count === 1 ? '1 registro' : `${t.count} registros`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** 3 · Ranking com barras de uso. */
function TagRanking() {
  const styles = useStyles();
  const toast = useToast();
  const max = PROFILE_TAGS[0].count;
  return (
    <View style={styles.ranking}>
      {PROFILE_TAGS.slice(0, 5).map((t, i) => (
        <Pressable key={t.name} onPress={() => toast(`Abre o diário filtrado por #${t.name}`)} style={({ pressed }) => [styles.rankRow, pressed && styles.pressed]}>
          <Text variant="caption" tone="muted" style={styles.rankPos}>
            {i + 1}
          </Text>
          <View style={styles.flex}>
            <View style={styles.rankHead}>
              <Text variant="bodyStrong">#{t.name}</Text>
              <Text variant="caption" tone="muted">
                {t.count}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${(t.count / max) * 100}%` }]} />
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Pill({
  label,
  selected = false,
  dashed = false,
  icon,
  onPress,
}: {
  label: string;
  selected?: boolean;
  dashed?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, selected && styles.pillSelected, dashed && styles.pillDashed, pressed && styles.pressed]}
    >
      {icon}
      <Text variant="caption" style={[styles.pillText, selected && styles.pillTextSelected]}>
        {label}
      </Text>
      {selected && onPress ? <X size={11} weight="bold" color={colors.surface} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  pressed: { opacity: 0.7 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: space.lg },
  device: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  header: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  block: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bleed: { marginHorizontal: -space.lg },
  rail: { paddingHorizontal: space.lg, gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
  },
  pillSelected: { backgroundColor: c.terracota600 },
  pillDashed: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  pillInput: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.terracota500, minWidth: 120 },
  pillText: { fontFamily: fonts.bodyHeavy, color: c.ink700 },
  pillTextSelected: { color: c.surface },
  inlineInput: { ...typeScale.caption, flex: 1, color: c.ink900, padding: 0, minWidth: 90 },
  tokenBox: {
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
  tokenBoxFocused: { borderColor: c.terracota500, backgroundColor: c.surface },
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
  tokenInput: { ...typeScale.body, flexGrow: 1, minWidth: 80, color: c.ink900, padding: 0 },
  review: {
    ...typeScale.body,
    minHeight: 96,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    color: c.ink900,
    textAlignVertical: 'top',
  },
  cloudTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
  },
  cloudText: { fontFamily: fonts.bodyHeavy, color: c.ink900 },
  card: { width: 140, gap: 4 },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: 136, marginBottom: space.xs },
  ranking: { gap: space.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rankPos: { width: 16, textAlign: 'center', fontVariant: ['tabular-nums'] },
  rankHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 6, marginTop: 6, borderRadius: 3, backgroundColor: c.surfaceSunken, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: c.terracota500 },
}));
