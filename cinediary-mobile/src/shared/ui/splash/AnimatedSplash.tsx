import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { palette, party } from '@/shared/theme';
import { CANVAS, C_GLYPH_TRANSFORM, C_GROUP_TRANSFORM, C_PATH, STAR_BOX, STAR_CENTER, STAR_PATH, STAR_REST_ROTATION } from './brandMark';

/**
 * PRECISA ser igual ao "imageWidth" do expo-splash-screen no app.json: é o que torna invisível a troca da
 * splash nativa (só o "c", parado) para esta. O "c" aparece exatamente no mesmo lugar e tamanho.
 */
const SIZE = 200;
/** Fundo igual ao "backgroundColor" da splash no app.json (terracota do ícone). */
export const SPLASH_BACKGROUND = palette.terracota600;

const k = SIZE / CANVAS; // canvas 1024 do ícone → dp
const starSize = STAR_BOX * k;
const starLeft = STAR_CENTER.x * k - starSize / 2;
const starTop = STAR_CENTER.y * k - starSize / 2;

/**
 * Trajetória da estrela cadente: uma curva (Bézier quadrática) que sai do alto à direita, fora do "c", e
 * termina no lugar exato da estrela no ícone (0, 0). Em dp, relativo a esse lugar.
 */
const FROM = { x: 190, y: -330 };
const BEND = { x: 150, y: -40 }; // puxa a curva para a direita: chega "de lado", como quem desce em arco
/** Rastro: quantas bolinhas e o atraso de cada uma em relação à estrela (fração do caminho). */
const TRAIL = [1, 2, 3, 4, 5, 6];
const TRAIL_LAG = 0.05;

/**
 * Espera antes do voo, contada a partir de quando a splash aparece. Nesse começo o app inteiro está montando
 * por trás (rotas, Início, imagens, login): com a estrela já voando, os quadros perdidos viravam "engasgos".
 */
const FLIGHT_DELAY = 320;
const FLIGHT_MS = 850;
const IMPACT_MS = 450;

function along(t: number) {
  'worklet';
  const u = 1 - t;
  return { x: u * u * FROM.x + 2 * u * t * BEND.x, y: u * u * FROM.y + 2 * u * t * BEND.y };
}

/**
 * Splash animada, por cima do app, na abertura. A ordem:
 * 1. Monta idêntica à splash nativa (fundo terracota + só o "c" no centro) e, assim que aparece, esconde a nativa.
 * 2. A estrela entra como uma estrela cadente: desce em arco do alto à direita, girando, com um rastro, e
 *    desacelera até parar no lugar dela no ícone.
 * 3. Impacto: a estrela dá um quique, o "c" "sente" o toque, sai um brilho em anel e o celular vibra de leve.
 * 4. Só sai quando a entrada terminou E o app está pronto (`ready`: login conferido, perfil carregado). Em
 *    internet lenta ela espera com o ícone completo, em vez de revelar uma tela vazia.
 * 5. Saída: amplia e some, revelando o app; então `onFinish` a desmonta.
 * Com "Reduzir movimento" ligado no sistema: a estrela só aparece no lugar, sem voo nem quique.
 */
export function AnimatedSplash({
  ready,
  onFinish,
  controlsStatusBar = true,
}: {
  ready: boolean;
  onFinish: () => void;
  /** false na prévia do catálogo (ela fica num quadro e não deve mudar a barra de status da tela). */
  controlsStatusBar?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const flight = useSharedValue(0); // 0 = no ponto de partida, 1 = pousou
  const impact = useSharedValue(0); // brilho do impacto
  const cScale = useSharedValue(1);
  const starPop = useSharedValue(1);
  const exit = useSharedValue(0);
  const [introDone, setIntroDone] = useState(false);
  // Só começa a contar depois que a splash está de fato na tela (e a nativa já pode sair).
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!shown) return;
    const done = () => setIntroDone(true);
    if (reduceMotion) {
      flight.set(withTiming(1, { duration: 250 }, (ok) => ok && scheduleOnRN(done)));
      return;
    }
    const land = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // o "c" recebe a estrela: afunda um tiquinho e volta com mola
      cScale.set(withSequence(withTiming(0.96, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 220 })));
      starPop.set(withSequence(withTiming(1.22, { duration: 110 }), withSpring(1, { damping: 6, stiffness: 200 })));
      impact.set(withTiming(1, { duration: IMPACT_MS, easing: Easing.out(Easing.cubic) }, (ok) => ok && scheduleOnRN(done)));
    };
    // Sai suave (sem um começo brusco, que deixava qualquer quadro perdido visível), ganha velocidade no meio
    // e freia bem no fim: chega "pousando", sem trombar.
    flight.set(
      withDelay(
        FLIGHT_DELAY,
        withTiming(1, { duration: FLIGHT_MS, easing: Easing.bezier(0.42, 0.1, 0.22, 1) }, (ok) => ok && scheduleOnRN(land)),
      ),
    );
  }, [shown, reduceMotion, flight, impact, cScale, starPop]);

  // Sai quando a entrada acabou e o app está pronto.
  useEffect(() => {
    if (!introDone || !ready) return;
    const finish = () => onFinish();
    exit.set(
      withDelay(
        reduceMotion ? 150 : 200,
        withTiming(1, { duration: reduceMotion ? 220 : 380, easing: Easing.in(Easing.cubic) }, (ok) => ok && scheduleOnRN(finish)),
      ),
    );
  }, [introDone, ready, reduceMotion, exit, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cScale.get() * (1 + exit.get() * (reduceMotion ? 0 : 0.25)) }],
  }));
  const starStyle = useAnimatedStyle(() => {
    const t = flight.get();
    if (reduceMotion) return { opacity: t, transform: [{ rotate: `${STAR_REST_ROTATION}deg` }] };
    const p = along(t);
    return {
      opacity: Math.min(1, t * 8),
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        // gira uma volta e meia no voo e para no ângulo do ícone
        { rotate: `${STAR_REST_ROTATION - (1 - t) * 540}deg` },
        { scale: (0.55 + 0.45 * t) * starPop.get() },
      ],
    };
  });
  const ringStyle = useAnimatedStyle(() => {
    const p = impact.get();
    return { opacity: p === 0 ? 0 : 0.7 * (1 - p), transform: [{ scale: 0.4 + 1.6 * p }] };
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Já está desenhada igual à nativa: agora a nativa pode sair sem nenhum salto.
      onLayout={() => {
        void SplashScreen.hideAsync();
        setShown(true);
      }}
    >
      {controlsStatusBar ? <StatusBar style="light" /> : null}
      <Animated.View style={[styles.mark, markStyle]}>
        {/* O "c", idêntico ao splash-icon.png */}
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
          <G transform={C_GROUP_TRANSFORM}>
            <Path d={C_PATH} transform={C_GLYPH_TRANSFORM} fill={party.cream} />
          </G>
        </Svg>

        {/* Brilho do impacto: um anel que abre e some no lugar da estrela */}
        <Animated.View style={[styles.ring, ringStyle]} />

        {/* Rastro da estrela cadente (atrás dela) */}
        {reduceMotion ? null : TRAIL.map((i) => <TrailDot key={i} index={i} flight={flight} />)}

        {/* A estrela, numa camada própria para girar em torno do próprio centro */}
        <Animated.View style={[styles.star, starStyle]}>
          <Svg width={starSize} height={starSize} viewBox="0 0 24 24">
            <Path d={STAR_PATH} fill={party.butter} stroke={party.butter} strokeWidth={1.8} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** Uma bolinha do rastro: segue o mesmo caminho da estrela, um pouco atrás, menor e mais apagada. */
function TrailDot({ index, flight }: { index: number; flight: SharedValue<number> }) {
  const size = starSize * (0.42 - index * 0.05);
  const style = useAnimatedStyle(() => {
    const t = flight.get();
    const behind = Math.max(0, t - index * TRAIL_LAG);
    const p = along(behind);
    // aparece durante o voo e some quando a estrela pousa (o rastro "alcança" a estrela)
    const visible = t <= 0 || t >= 1 ? 0 : Math.min(1, t * 6) * Math.min(1, (1 - t) * 5);
    return {
      opacity: visible * (0.55 - index * 0.07),
      transform: [{ translateX: p.x }, { translateY: p.y }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, left: STAR_CENTER.x * k - size / 2, top: STAR_CENTER.y * k - size / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: SPLASH_BACKGROUND, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  mark: { width: SIZE, height: SIZE },
  star: { position: 'absolute', width: starSize, height: starSize, left: starLeft, top: starTop },
  dot: { position: 'absolute', backgroundColor: party.butter },
  ring: {
    position: 'absolute',
    width: starSize,
    height: starSize,
    left: starLeft,
    top: starTop,
    borderRadius: starSize / 2,
    borderWidth: 2,
    borderColor: party.butter,
  },
});
