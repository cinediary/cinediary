import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowCounterClockwise, EyeSlash, Heart, Star, StarHalf } from 'phosphor-react-native';
import type { ComponentRef, Ref } from 'react';
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
 * Imagem 9:16 de uma entrada para os Stories: o pôster desfocado de fundo, o pôster grande, título,
 * nota, curtida, a review (cortada se for longa) e a assinatura (foto ou inicial + "@usuário no CineDiary"). Review com spoiler NUNCA
 * vai para a imagem: no lugar dela, um aviso. As margens de cima e de baixo respeitam a área que o
 * Instagram cobre com a interface (story.safeTop/safeBottom).
 * Tudo aqui é desenhado em imagem (sem BlurView), porque a captura (view-shot) não pega o desfoque nativo.
 */
export function EntryStoryCard({
  entry,
  author,
  width,
  ref,
}: {
  entry: DiaryEntry;
  /** Quem registrou: a assinatura no rodapé (foto, ou a inicial, + @usuário). */
  author: { username: string; name: string; avatarUrl: string | null };
  width: number;
  ref?: Ref<ComponentRef<typeof View>>;
}) {
  const t = strings.diary;
  const k = width / BASE;
  const px = (n: number) => Math.round(n * k * 10) / 10;
  const height = (width * story.exportHeight) / story.exportWidth;
  const safeTop = (story.safeTop / story.exportHeight) * height;
  const safeBottom = (story.safeBottom / story.exportHeight) * height;
  const review = entry.reviewText?.trim() ?? '';
  const clipped = review.length > REVIEW_MAX ? `${review.slice(0, REVIEW_MAX).trimEnd()}…` : review;
  const subtitle = [
    entry.scope ? scopeLabel(entry.scope) : entry.title.year,
    entry.watchedDate && formatFullDate(parseIsoDate(entry.watchedDate)),
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View ref={ref} collapsable={false} style={[styles.root, { width, height }]}>
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
      <View style={[styles.content, { paddingTop: safeTop, paddingBottom: safeBottom, paddingHorizontal: px(28), gap: px(14) }]}>
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

        <Text style={[styles.title, { fontSize: px(26), lineHeight: px(31), marginTop: px(6) }]} numberOfLines={3}>
          {entry.title.title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, { fontSize: px(12), lineHeight: px(16) }]}>{subtitle}</Text> : null}

        <View style={[styles.row, { gap: px(10) }]}>
          {entry.rating ? <Stars value={entry.rating} size={px(22)} /> : null}
          {entry.liked ? <Heart size={px(22)} weight="fill" color={semantic.liked} /> : null}
          {entry.isRewatch ? <ArrowCounterClockwise size={px(20)} color={party.cream} weight="bold" /> : null}
        </View>

        {review ? (
          entry.containsSpoilers ? (
            <View style={[styles.spoiler, { gap: px(6), paddingHorizontal: px(14), paddingVertical: px(8), borderRadius: px(999) }]}>
              <EyeSlash size={px(15)} color={party.cream} />
              <Text style={[styles.spoilerText, { fontSize: px(12), lineHeight: px(16) }]}>{t.spoilerInList}</Text>
            </View>
          ) : (
            <Text style={[styles.review, { fontSize: px(15), lineHeight: px(22) }]} numberOfLines={7}>
              “{clipped}”
            </Text>
          )
        ) : null}

        <View style={styles.spacer} />
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
  content: { flex: 1, alignItems: 'center' },
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
  spoiler: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,244,230,0.14)' },
  spoilerText: { fontFamily: fonts.bodyHeavy, color: party.cream },
  spacer: { flex: 1 },
  signature: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,244,230,0.12)' },
  brand: { fontFamily: fonts.body, color: 'rgba(255,244,230,0.8)', textAlign: 'center' },
  brandUser: { fontFamily: fonts.bodyHeavy, color: party.cream },
});
