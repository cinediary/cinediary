import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  CANVAS,
  C_GLYPH_TRANSFORM,
  C_GROUP_TRANSFORM,
  C_PATH,
  STAR_BOX,
  STAR_CENTER,
  STAR_PATH,
  STAR_REST_ROTATION,
} from './cinediaryMark';

// PRECISA ser igual ao "imageWidth" do expo-splash-screen no app.json.
// É isso que faz a troca nativa → JS ser invisível: o "c" já está
// exatamente no mesmo lugar e tamanho quando este componente aparece.
const SIZE = 200;
const BG = '#A9553A'; // terracota (t600 do tokens.ts)
const CREAM = '#FFF4E6';
const BUTTER = '#F4C84B';

// Mesma curva "pop" do Match Story (cubic-bezier(.2,1.4,.4,1)):
// passa um pouco do ponto e volta, dando o efeito de "quique".
const POP = Easing.bezier(0.2, 1.4, 0.4, 1);

const k = SIZE / CANVAS; // converte coordenadas do canvas 1024 para dp
const starSize = STAR_BOX * k;

type Props = { onFinish: () => void };

export function AnimatedSplash({ onFinish }: Props) {
  const reduceMotion = useReducedMotion();

  // Cada valor vai de 0 a 1 e representa o "progresso" de uma parte.
  const cScale = useSharedValue(1);
  const star = useSharedValue(0);
  const word = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    const finish = (done?: boolean) => {
      'worklet';
      if (done) runOnJS(onFinish)();
    };

    if (reduceMotion) {
      // Acessibilidade: sem pulos nem giros, só um fade curto.
      star.value = withTiming(1, { duration: 200 });
      word.value = withTiming(1, { duration: 200 });
      exit.value = withDelay(600, withTiming(1, { duration: 250 }, finish));
      return;
    }

    // 1) o "c" respira: encolhe um pouco e volta com mola
    cScale.value = withSequence(
      withTiming(0.92, { duration: 160, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 160 }),
    );
    // 2) a estrela "cai" girando e quica no lugar
    star.value = withDelay(140, withTiming(1, { duration: 700, easing: POP }));
    // 3) o nome aparece subindo
    word.value = withDelay(520, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    // 4) tudo some ampliando, revelando o app por baixo
    exit.value = withDelay(1600, withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) }, finish));
  }, [reduceMotion]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cScale.value * (1 + exit.value * 0.25) }],
  }));

  const starStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, star.value * 2),
    transform: [
      { translateY: (1 - star.value) * -40 },
      { scale: 0.3 + 0.7 * star.value },
      { rotate: `${STAR_REST_ROTATION - (1 - star.value) * 140}deg` },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 12 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none">
      <Animated.View style={[styles.mark, markStyle]}>
        {/* O "c", idêntico ao splash-icon.png */}
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
          <G transform={C_GROUP_TRANSFORM}>
            <Path d={C_PATH} transform={C_GLYPH_TRANSFORM} fill={CREAM} />
          </G>
        </Svg>

        {/* A estrela fica numa camada própria para girar em torno do próprio centro */}
        <Animated.View
          style={[
            styles.star,
            {
              width: starSize,
              height: starSize,
              left: STAR_CENTER.x * k - starSize / 2,
              top: STAR_CENTER.y * k - starSize / 2,
            },
            starStyle,
          ]}
        >
          <Svg width={starSize} height={starSize} viewBox="0 0 24 24">
            <Path d={STAR_PATH} fill={BUTTER} stroke={BUTTER} strokeWidth={1.8} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Ajuste os nomes das fontes para os que você carrega no useFonts */}
      <Animated.View style={[styles.wordWrap, wordStyle]}>
        <Text style={styles.word}>
          cine<Text style={styles.wordItalic}>diary</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  mark: {
    width: SIZE,
    height: SIZE,
  },
  star: {
    position: 'absolute',
  },
  wordWrap: {
    position: 'absolute',
    top: '50%',
    // o "c" termina ~46dp abaixo do centro; o nome fica logo abaixo dele
    marginTop: 64,
  },
  word: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    color: CREAM,
  },
  wordItalic: {
    fontFamily: 'Fraunces_600SemiBold_Italic',
  },
});
