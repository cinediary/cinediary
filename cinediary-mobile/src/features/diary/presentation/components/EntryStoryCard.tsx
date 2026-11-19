import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowCounterClockwise, EyeSlash, Heart, Star, StarHalf } from 'phosphor-react-native';
import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatFullDate, parseIsoDate, strings } from '@/shared/i18n';
import { fonts, palette, party, semantic, story } from '@/shared/theme';
import { Avatar, Text } from '@/shared/ui';
import { type DiaryEntry } from '../../domain/diary';
import { scopeLabel } from '../scopeLabel';

/** Largura de referência do layout: tudo escala a partir dela (a exportação sai em 1080×1920). */
const BASE = 360;
const REVIEW_MAX = 280;

/**
 * Imagem 9:16 de uma entrada para os Stories, em duas camadas:
 * - o fundo: o pôster desfocado com o degradê (`backgroundRef`);
 * - o cartão (`stickerRef`, fundo transparente): pôster grande, título, nota, curtida, a review (cortada se for longa)
 *   e a assinatura (foto ou inicial + "@usuário no CineDiary"). No Instagram ele vira um sticker que a pessoa move,
 *   aumenta e gira por cima do fundo.
 * O todo (`ref`) é a imagem pronta, para a folha de compartilhar do sistema (que não tem sticker) e a prévia.
 * Review com spoiler NUNCA vai para a imagem: no lugar dela, um aviso. O cartão fica entre as áreas que o Instagram
 * cobre com a interface (story.safeTop/safeBottom).
 * Tudo aqui é desenhado em imagem (sem BlurView), porque a captura (view-shot) não pega o desfoque nativo.
 */
export function EntryStoryCard({
  entry,
  author,
  width,
  ref,
  backgroundRef,
  stickerRef,
  showReview = true,
}: {
  entry: DiaryEntry;
  /** Quem registrou: a assinatura (foto, ou a inicial, + @usuário). */
  author: { username: string; name: string; avatarUrl: string | null };
  width: number;
  /** A imagem inteira (fundo + cartão). */
  ref?: Ref<ComponentRef<typeof View>>;
  /** Só o fundo desfocado. */
  backgroundRef?: Ref<ComponentRef<typeof View>>;
  /** Só o cartão, com fundo transparente (o sticker). */
  stickerRef?: Ref<ComponentRef<typeof View>>;
  /** false: o cartão sai sem a review (nem o aviso de spoiler). */
  showReview?: boolean;
}) {
  const k = width / BASE;
  const height = (width * story.exportHeight) / story.exportWidth;
  const safeTop = (story.safeTop / story.exportHeight) * height;
  const safeBottom = (story.safeBottom / story.exportHeight) * height;
  // Título longo + review longa: o cartão passa da área livre. Na imagem inteira (e na prévia), ele encolhe para
  // caber; o sticker do Instagram sai no tamanho cheio (a escala é do pai, a captura do cartão não a pega).
  const [stickerHeight, setStickerHeight] = useState(0);
  const free = height - safeTop - safeBottom;
  const scale = stickerHeight > free ? free / stickerHeight : 1;

  return (
    <View ref={ref} collapsable={false} style={[styles.root, { width, height }]}>
      <View ref={backgroundRef} collapsable={false} style={StyleSheet.absoluteFill}>
        {entry.title.posterUrl ? (
          <Image
            source={entry.title.posterUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={40}
            cachePolicy="memory-disk"
          />
        ) : null}
        <LinearGradient
          colors={['rgba(42,33,28,0.35)', 'rgba(42,33,28,0.7)', 'rgba(42,33,28,0.94)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.stage, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <View style={{ transform: [{ scale }] }} onLayout={(e) => setStickerHeight(e.nativeEvent.layout.height)}>
          <StorySticker ref={stickerRef} entry={entry} author={author} k={k} showReview={showReview} />
        </View>
      </View>
    </View>
  );
}

/** O cartão (sticker): sem fundo, com sombra no pôster e no texto para ler sobre qualquer parte do Story. */
function StorySticker({
  entry,
  author,
  k,
  ref,
  showReview,
}: {
  entry: DiaryEntry;
  author: { username: string; name: string; avatarUrl: string | null };
  k: number;
  showReview: boolean;
  ref?: Ref<ComponentRef<typeof View>>;
}) {
  const t = strings.diary;
  const px = (n: number) => Math.round(n * k * 10) / 10;
  const review = showReview ? (entry.reviewText?.trim() ?? '') : '';
  const clipped = review.length > REVIEW_MAX ? `${review.slice(0, REVIEW_MAX).trimEnd()}…` : review;
  const subtitle = [
    entry.scope ? scopeLabel(entry.scope) : entry.title.year,
    entry.watchedDate && formatFullDate(parseIsoDate(entry.watchedDate)),
  ]
    .filter(Boolean)
    .join('  ·  ');
  // Sombra no texto: sem fundo atrás, ela segura a leitura quando o cartão vai para cima de uma parte clara.
  const textShadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: px(1) }, textShadowRadius: px(6) };

  return (
    // Respiro em volta: a sombra do pôster precisa de espaço para não sair cortada na captura.
    <View ref={ref} collapsable={false} style={[styles.sticker, { width: px(BASE - 24), padding: px(16), gap: px(18) }]}>
      {/*
        Sombra por fora e recorte por dentro: no iOS, overflow hidden corta a sombra, então são duas Views.
        Cantos "contínuos" (squircle), sem a borda clara que deixava o pôster desalinhado do contorno.
      */}
      <View style={[styles.posterShadow, { borderRadius: px(18), shadowRadius: px(18), shadowOffset: { width: 0, height: px(10) } }]}>
        <View style={[styles.poster, { width: px(176), height: px(264), borderRadius: px(18) }]}>
          {entry.title.posterUrl ? (
            <Image source={entry.title.posterUrl} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <Text style={[styles.posterFallback, { fontSize: px(18), padding: px(12) }]}>{entry.title.title}</Text>
          )}
        </View>
      </View>

      {/* Título, data e nota juntos, como um bloco só; a review vem depois, com um respiro maior. */}
      <View style={[styles.meta, { gap: px(6) }]}>
        <Text style={[styles.title, textShadow, { fontSize: px(26), lineHeight: px(31) }]} numberOfLines={3}>
          {entry.title.title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, textShadow, { fontSize: px(12), lineHeight: px(16) }]}>{subtitle}</Text> : null}
        {/* Sem nota, curtida nem rever, a linha nem entra (antes ficava vazia e somava mais um espaço). */}
        {entry.rating || entry.liked || entry.isRewatch ? (
          <View style={[styles.row, { gap: px(10), marginTop: px(4) }]}>
            {entry.rating ? <Stars value={entry.rating} size={px(22)} /> : null}
            {entry.liked ? <Heart size={px(22)} weight="fill" color={semantic.liked} /> : null}
            {entry.isRewatch ? <ArrowCounterClockwise size={px(20)} color={party.cream} weight="bold" /> : null}
          </View>
        ) : null}
      </View>

      {review ? (
        entry.containsSpoilers ? (
          <View style={[styles.spoiler, { gap: px(6), paddingHorizontal: px(14), paddingVertical: px(8), borderRadius: px(999) }]}>
            <EyeSlash size={px(15)} color={party.cream} />
            <Text style={[styles.spoilerText, { fontSize: px(12), lineHeight: px(16) }]}>{t.spoilerInList}</Text>
          </View>
        ) : (
          <Text style={[styles.review, textShadow, { fontSize: px(15), lineHeight: px(22) }]} numberOfLines={7}>
            “{clipped}”
          </Text>
        )
      ) : null}

      {/* Assinatura: quem registrou, num selo próprio (não em cima do pôster). */}
      <View
        style={[
          styles.signature,
          { gap: px(8), paddingLeft: px(5), paddingRight: px(14), paddingVertical: px(5), borderRadius: px(999) },
        ]}
      >
        <Avatar
          name={author.name || author.username || '?'}
          imageUrl={author.avatarUrl}
          size={px(30)}
          background={palette.pipoca300}
          borderColor={party.cream}
        />
        <Text style={[styles.brand, { fontSize: px(13), lineHeight: px(18) }]}>
          <Text style={[styles.brandUser, { fontSize: px(13) }]}>@{author.username}</Text> {t.shareMadeWith}
        </Text>
      </View>
    </View>
  );
}

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        const Icon = half ? StarHalf : Star;
        return (
          <Icon
            key={i}
            size={size}
            weight={full || half ? 'fill' : 'regular'}
            color={full || half ? semantic.starFill : 'rgba(255,244,230,0.45)'}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: palette.ink900 },
  // O cartão no meio da área livre do Story (no Instagram, a pessoa o move para onde quiser).
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sticker: { alignItems: 'center', backgroundColor: 'transparent' },
  meta: { alignItems: 'center' },
  posterShadow: { shadowColor: '#000', shadowOpacity: 0.45, elevation: 12 },
  poster: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    backgroundColor: palette.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallback: { fontFamily: fonts.display, color: palette.ink700, textAlign: 'center' },
  title: { fontFamily: fonts.display, color: party.cream, textAlign: 'center' },
  subtitle: {
    fontFamily: fonts.bodyHeavy,
    color: 'rgba(255,244,230,0.75)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  review: { fontFamily: fonts.displayItalic, color: party.cream, textAlign: 'center' },
  spoiler: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(42,33,28,0.45)' },
  spoilerText: { fontFamily: fonts.bodyHeavy, color: party.cream },
  signature: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(42,33,28,0.45)' },
  brand: { fontFamily: fonts.body, color: 'rgba(255,244,230,0.8)', textAlign: 'center' },
  brandUser: { fontFamily: fonts.bodyHeavy, color: party.cream },
});
