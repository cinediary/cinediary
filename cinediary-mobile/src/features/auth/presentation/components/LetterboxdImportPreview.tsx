import { BookmarkSimple, Heart, Notebook, Star, type Icon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { usePopularTitles } from '@/features/catalog/application/catalogQueries';
import { strings } from '@/shared/i18n';
import { palette, poster, shadow, space } from '@/shared/theme';
import { PosterArt, Skeleton, Text } from '@/shared/ui';

const CENTER_W = poster.md.width;
const SIDE_W = Math.round(CENTER_W * 0.86);
/** Os pôsteres dos lados, inclinados e um pouco por baixo do do meio. */
const FAN = [
  { rotate: '-9deg', translateX: CENTER_W * 0.62, translateY: 10, width: SIDE_W },
  { rotate: '0deg', translateX: 0, translateY: 0, width: CENTER_W },
  { rotate: '9deg', translateX: -CENTER_W * 0.62, translateY: 10, width: SIDE_W },
];
const ICONS: Icon[] = [Notebook, Star, BookmarkSimple, Heart];

/**
 * O meio da pergunta do Letterboxd: um leque com 3 pôsteres populares (os seus filmes vêm junto) e a lista do
 * que a importação traz. Enquanto os pôsteres carregam, esqueletos do mesmo tamanho (nada pula).
 */
export function LetterboxdImportPreview() {
  const t = strings.onboarding;
  const popular = usePopularTitles('MOVIE');
  const titles = (popular.data?.items ?? []).filter((title) => title.posterUrl).slice(0, 3);

  return (
    <View style={styles.root}>
      <View style={styles.fan} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {FAN.map((slot, i) => {
          const title = titles[i];
          const style = [
            styles.poster,
            i === 1 && styles.front,
            { transform: [{ translateX: slot.translateX }, { translateY: slot.translateY }, { rotate: slot.rotate }] },
          ];
          return title ? (
            <Animated.View key={title.id} entering={FadeIn.duration(300).delay(i === 1 ? 0 : 120)} style={style}>
              <PosterArt title={title.title} posterUrl={title.posterUrl} width={slot.width} />
            </Animated.View>
          ) : (
            <View key={`skeleton-${i}`} style={style}>
              <Skeleton width={slot.width} height={Math.round(slot.width / poster.ratio)} radius={poster.radius} />
            </View>
          );
        })}
      </View>

      <View style={styles.list}>
        {t.letterboxdBrings.map((label, i) => {
          const ItemIcon = ICONS[i] ?? Star;
          return (
            <Animated.View key={label} entering={FadeInDown.duration(300).delay(150 + i * 60)} style={styles.item}>
              <ItemIcon size={22} color={palette.terracota600} weight="duotone" />
              <Text>{label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space['2xl'], paddingTop: space.lg },
  fan: { height: Math.round(CENTER_W / poster.ratio) + 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' },
  poster: { ...shadow.e2 },
  // O do meio por cima dos outros (no Android, quem decide a ordem é a elevação).
  front: { zIndex: 1, elevation: 8 },
  list: { gap: space.md, alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
