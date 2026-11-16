import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
// Botões do Gesture Handler: participam dos gestos nativos do Story, então tocar no botão não conta
// como "toque para avançar" (com o Pressable do React Native, os dois disparavam).
import { Pressable } from 'react-native-gesture-handler';
import Svg, { Polygon } from 'react-native-svg';

import { strings } from '@/shared/i18n';
import { party } from '@/shared/theme';
import { Avatar, PosterArt } from '@/shared/ui';
import type { MatchStory, Person } from '../../../domain/match';
import { discoveryColumns, genreEmoji, genreShares, levelIndex, recommendations, starsText, type SlideKind } from '../../../domain/story';
import { BreakdownBars } from '../BreakdownBars';
import { Pop, SANS_HEAVY, StoryText, StoryTitle } from './StoryPrimitives';

const s = strings.match.story;

/** Fundo e cor do texto de cada slide (paleta "Festa", só no Story). */
export const SLIDE_COLORS: Record<SlideKind, { bg: string; fg: string }> = {
  OPENING: { bg: party.plum, fg: party.cream },
  SCORE: { bg: party.butter, fg: party.ink },
  BREAKDOWN: { bg: party.cream, fg: party.ink },
  GENRES: { bg: party.sage, fg: '#1F2A1C' },
  BOTH_LOVED: { bg: party.blush, fg: party.ink },
  DISAGREEMENTS: { bg: party.tomato, fg: party.cream },
  DISCOVERY: { bg: party.blush, fg: party.ink },
  RECOMMENDATIONS: { bg: party.ink, fg: party.cream },
  CLOSING: { bg: party.butter, fg: party.ink },
};

export interface SlideProps {
  story: MatchStory;
  reduceMotion: boolean;
  /** Durante a exportação, botões somem e a marca aparece. */
  capturing: boolean;
  onGoToRoom: () => void;
}

const firstWord = (name: string) => name.split(/\s+/)[0] ?? '';
const firstNameOf = (p: Person | null) => firstWord(p?.name ?? '');

// ---------- 1 · Abertura (plum + blob blush) ----------
function OpeningSlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.OPENING.fg;
  const a = firstNameOf(story.creator);
  const b = firstNameOf(story.partner);
  return (
    <>
      <View
        style={[
          styles.blob,
          {
            width: 340,
            height: 300,
            right: -120,
            top: 120,
            backgroundColor: party.blush,
            borderTopLeftRadius: 160,
            borderTopRightRadius: 180,
            borderBottomRightRadius: 190,
            borderBottomLeftRadius: 130,
          },
        ]}
      />
      <Pop step={1} reduceMotion={reduceMotion} style={styles.avatars}>
        <Avatar name={a} imageUrl={story.creator.avatarUrl} size={96} background={party.butter} borderColor={party.plum} />
        <View style={{ marginLeft: -14 }}>
          <Avatar name={b} imageUrl={story.partner?.avatarUrl} size={96} background={party.sage} borderColor={party.plum} />
        </View>
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion}>
        <StoryTitle parts={[`${a} `, '&', `\n${b}`]} size={72} color={fg} />
      </Pop>
      <Pop step={3} reduceMotion={reduceMotion}>
        <StoryText size={20} color={fg} style={styles.mt18}>
          {s.openingText}
        </StoryText>
      </Pop>
    </>
  );
}

/** Estrela de 10 pontas do protótipo (clip-path em SVG). */
function StarShape({ size, color }: { size: number; color: string }) {
  const pts = [
    [50, 0],
    [61, 35],
    [98, 35],
    [68, 57],
    [79, 91],
    [50, 70],
    [21, 91],
    [32, 57],
    [2, 35],
    [39, 35],
  ]
    .map(([x, y]) => `${((x ?? 0) / 100) * size},${((y ?? 0) / 100) * size}`)
    .join(' ');
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts} fill={color} />
    </Svg>
  );
}

// ---------- 2 · A porcentagem (butter + estrela tomato) ----------
function ScoreSlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.SCORE.fg;
  const target = story.score ?? 0;
  const [counted, setCounted] = useState(0);
  // Com "Reduzir movimento" o número aparece direto no valor final.
  const value = reduceMotion ? target : counted;

  // Contador de 0 até a nota, como no protótipo (passo = 1/8 do que falta, a cada 60 ms).
  useEffect(() => {
    if (reduceMotion) return;
    let v = 0;
    const id = setInterval(() => {
      v += Math.ceil((target - v) / 8);
      setCounted(Math.min(v, target));
      if (v >= target) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [target, reduceMotion]);

  const level = story.discoveryMode ? s.discoveryBadge : (s.levels[levelIndex(story.score)]?.parts ?? s.levels[3].parts);
  return (
    <>
      <View style={[styles.blob, { left: -80, bottom: 60 }]}>
        <StarShape size={260} color={party.tomato} />
      </View>
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryText size={24} weight="heavy" color={fg}>
          {s.youAre}
        </StoryText>
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion}>
        <StoryTitle parts={[`${value}%`]} size={150} color={fg} fit style={styles.scoreNumber} />
      </Pop>
      <Pop step={3} reduceMotion={reduceMotion}>
        <StoryTitle parts={['', s.cinemaTogether]} size={44} color={fg} />
      </Pop>
      <Pop step={3} reduceMotion={reduceMotion} style={styles.badge}>
        <StoryTitle parts={level} size={16} color={party.butter} style={styles.badgeText} />
      </Pop>
    </>
  );
}

// ---------- 3 · De onde veio o número (cream + barras) ----------
function BreakdownSlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.BREAKDOWN.fg;
  return (
    <>
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.breakdownTitle} size={46} color={fg} style={styles.mb14} />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion}>
        <BreakdownBars story={story} variant="story" />
      </Pop>
      <Pop step={3} reduceMotion={reduceMotion}>
        <StoryText size={16} color={fg} style={styles.mt14}>
          {story.discoveryMode ? s.breakdownDiscovery : s.breakdownNormal(story.breakdown.commonRatedCount)}
        </StoryText>
      </Pop>
    </>
  );
}

// ---------- 4 · Gêneros (sage + forma cream) ----------
function GenresSlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.GENRES.fg;
  const shares = genreShares(story.commonGenres);
  const tilt = [-3, 2, -1];
  return (
    <>
      <View
        style={[
          styles.blob,
          {
            width: 300,
            height: 300,
            right: -100,
            top: 90,
            backgroundColor: party.cream,
            opacity: 0.55,
            borderTopLeftRadius: 120,
            borderTopRightRadius: 180,
            borderBottomRightRadius: 165,
            borderBottomLeftRadius: 135,
          },
        ]}
      />
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={[s.genresTitle]} size={52} color={fg} />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion} style={styles.genreWrap}>
        {shares.length === 0 ? (
          <StoryText size={20} color={fg}>
            {s.genresEmpty}
          </StoryText>
        ) : (
          shares.map((g, k) => (
            <View key={g.name} style={[styles.genreChip, { transform: [{ rotate: `${tilt[k] ?? 0}deg` }] }]}>
              <StoryText size={22} weight="heavy" color={party.cream}>
                {`${genreEmoji(g.name)} ${g.name}`}
              </StoryText>
              <View style={styles.genreShare}>
                <StoryText size={14} weight="heavy" color={party.ink}>
                  {`${g.share}%`}
                </StoryText>
              </View>
            </View>
          ))
        )}
      </Pop>
    </>
  );
}

// ---------- 5 · Vocês dois amam (blush + arco tomato) ----------
function BothLovedSlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.BOTH_LOVED.fg;
  const tilt = [-6, 0, 6];
  const items = story.bothLoved.slice(0, 3);
  return (
    <>
      <View
        style={[
          styles.blob,
          {
            width: 420,
            height: 210,
            left: -30,
            bottom: 110,
            backgroundColor: party.tomato,
            opacity: 0.35,
            borderTopLeftRadius: 210,
            borderTopRightRadius: 210,
          },
        ]}
      />
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.bothLovedTitle} size={52} color={fg} style={styles.mb22} />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion} style={styles.lovedRow}>
        {items.length === 0 ? (
          <StoryText size={18} color={fg}>
            {s.bothLovedEmpty}
          </StoryText>
        ) : (
          items.map((t, k) => (
            <View key={t.id} style={[styles.center, { transform: [{ rotate: `${tilt[k] ?? 0}deg` }] }]}>
              <PosterArt title={t.title} posterUrl={t.posterUrl} width={104} height={156} fontSize={13} />
              {t.state.rating ? (
                <StoryText size={12} weight="heavy" color={fg} style={styles.mt6}>
                  {starsText(t.state.rating)}
                </StoryText>
              ) : null}
            </View>
          ))
        )}
      </Pop>
    </>
  );
}

// ---------- 6 · Onde discordam (tomato) ----------
function DisagreementsSlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.DISAGREEMENTS.fg;
  const d = story.disagreements[0];
  if (!d) {
    return (
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.disagreeEmpty} size={52} color={fg} />
      </Pop>
    );
  }
  return (
    <>
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.disagreeTitle} size={52} color={fg} style={styles.mb22} />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion} style={styles.disagreeRow}>
        <PosterArt title={d.title.title} posterUrl={d.title.posterUrl} width={130} height={195} fontSize={16} />
        <StoryText size={22} weight="heavy" color={fg} style={styles.lh16}>
          {`${firstNameOf(story.creator)}\n`}
          <StoryText size={22} weight="heavy" color={party.butter}>{`${starsText(d.creatorRating)}\n`}</StoryText>
          {`${firstNameOf(story.partner)}\n`}
          <StoryText size={22} weight="heavy" color={party.butter}>
            {starsText(d.partnerRating)}
          </StoryText>
        </StoryText>
      </Pop>
      <Pop step={3} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.disagreeText} size={30} color={fg} style={styles.mt22} />
      </Pop>
    </>
  );
}

// ---------- 5+6 no Modo Descoberta · "Vocês têm muito a apresentar" (blush) ----------
function DiscoverySlide({ story, reduceMotion }: SlideProps) {
  const fg = SLIDE_COLORS.DISCOVERY.fg;
  return (
    <>
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.discoveryTitle} size={42} color={fg} style={styles.mb18} />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion} style={styles.columns}>
        {discoveryColumns(story).map((col) => (
          <View key={col.lover.id} style={styles.column}>
            <StoryText size={16} weight="heavy" color={fg} style={styles.mb8}>
              {s.lovesNotSeen(firstNameOf(col.lover), firstNameOf(col.other))}
            </StoryText>
            {col.titles.map((t, k) => (
              <View key={t.id} style={[styles.mb8, { transform: [{ rotate: `${k % 2 ? 3 : -3}deg` }] }]}>
                <PosterArt title={t.title} posterUrl={t.posterUrl} width={140} height={70} fontSize={13} />
              </View>
            ))}
          </View>
        ))}
      </Pop>
    </>
  );
}

// ---------- 7 · Para verem juntos (ink + destaque butter) ----------
function RecommendationsSlide(props: SlideProps) {
  const { story, reduceMotion, capturing } = props;
  const fg = SLIDE_COLORS.RECOMMENDATIONS.fg;
  const recs = recommendations(story);
  return (
    <>
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle parts={s.togetherTitle} size={52} color={fg} emColor={party.butter} style={styles.mb20} />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion}>
        {recs.length === 0 ? (
          <StoryText size={18} color={fg}>
            {s.recsEmpty}
          </StoryText>
        ) : (
          recs.map((r) => (
            <View key={r.title.id} style={styles.recRow}>
              <PosterArt title={r.title.title} posterUrl={r.title.posterUrl} width={56} height={84} fontSize={9} />
              <View style={styles.flex}>
                <StoryText size={18} weight="heavy" color={fg}>
                  {r.title.title}
                </StoryText>
                <StoryText size={14} color={party.blush}>
                  {r.reason.kind === 'BOTH' ? s.reasonBoth : s.reasonLoves(firstWord(r.reason.lover), firstWord(r.reason.other))}
                </StoryText>
              </View>
            </View>
          ))
        )}
      </Pop>
      {!capturing && recs.length > 0 ? (
        <Pop step={3} reduceMotion={reduceMotion}>
          {/* As sugestões já entram sozinhas na lista de vocês quando o Match fica ativo (backend). */}
          <View accessible accessibilityRole="text" style={[styles.pill, { backgroundColor: party.butter }]}>
            <StoryText size={16} weight="heavy" color={party.ink}>
              {s.inYourList}
            </StoryText>
          </View>
        </Pop>
      ) : null}
    </>
  );
}

// ---------- 8 · Encerramento (butter) ----------
function ClosingSlide({ story, reduceMotion, capturing, onGoToRoom }: SlideProps) {
  const fg = SLIDE_COLORS.CLOSING.fg;
  return (
    <>
      <Pop step={1} reduceMotion={reduceMotion}>
        <StoryTitle
          parts={[`${firstNameOf(story.creator)} + ${firstNameOf(story.partner)}\n= `, `${story.score ?? 0}%`]}
          size={66}
          color={fg}
        />
      </Pop>
      <Pop step={2} reduceMotion={reduceMotion}>
        <StoryText size={18} color={fg} style={styles.closingText}>
          {story.discoveryMode ? s.closingDiscovery : s.closingNormal}
        </StoryText>
      </Pop>
      {!capturing ? (
        <Pop step={3} reduceMotion={reduceMotion}>
          <Pressable accessibilityRole="button" onPress={onGoToRoom} style={[styles.pill, styles.pillTall, { backgroundColor: party.ink }]}>
            <StoryText size={16} weight="heavy" color={party.cream}>
              {s.goToRoom}
            </StoryText>
          </Pressable>
        </Pop>
      ) : null}
    </>
  );
}

const SLIDES: Record<SlideKind, (p: SlideProps) => React.ReactNode> = {
  OPENING: OpeningSlide,
  SCORE: ScoreSlide,
  BREAKDOWN: BreakdownSlide,
  GENRES: GenresSlide,
  BOTH_LOVED: BothLovedSlide,
  DISAGREEMENTS: DisagreementsSlide,
  DISCOVERY: DiscoverySlide,
  RECOMMENDATIONS: RecommendationsSlide,
  CLOSING: ClosingSlide,
};

export function StorySlide({ kind, ...props }: SlideProps & { kind: SlideKind }) {
  const Slide = SLIDES[kind];
  return <Slide {...props} />;
}

/** Marca "cinediary" no rodapé da imagem exportada. */
export function StoryBrand({ color }: { color: string }) {
  return (
    <View style={styles.brand} pointerEvents="none">
      <StoryTitle parts={s.brand} size={28} color={color} />
      <StoryText size={14} color={color}>
        {s.brandCta}
      </StoryText>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
  avatars: { flexDirection: 'row', marginBottom: 26 },
  scoreNumber: { letterSpacing: -4 },
  badge: {
    marginTop: 22,
    alignSelf: 'flex-start',
    backgroundColor: party.ink,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    transform: [{ rotate: '-3deg' }],
  },
  badgeText: { fontFamily: SANS_HEAVY, lineHeight: 20 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 22 },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: party.ink,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 99,
    marginRight: 8,
    marginBottom: 10,
  },
  genreShare: { backgroundColor: party.butter, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  lovedRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  center: { alignItems: 'center' },
  disagreeRow: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  lh16: { lineHeight: 35 },
  columns: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  column: { flex: 1 },
  recRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  flex: { flex: 1 },
  pill: { marginTop: 10, minHeight: 48, borderRadius: 99, paddingHorizontal: 20, alignSelf: 'flex-start', justifyContent: 'center' },
  pillTall: { minHeight: 52, paddingHorizontal: 22 },
  closingText: { marginTop: 16, marginBottom: 26 },
  brand: { position: 'absolute', left: 30, right: 30, bottom: 40, alignItems: 'center', gap: 2 },
  mt6: { marginTop: 6 },
  mt14: { marginTop: 14 },
  mt18: { marginTop: 18 },
  mt22: { marginTop: 22 },
  mb8: { marginBottom: 8 },
  mb14: { marginBottom: 14 },
  mb18: { marginBottom: 18 },
  mb20: { marginBottom: 20 },
  mb22: { marginBottom: 22 },
});
