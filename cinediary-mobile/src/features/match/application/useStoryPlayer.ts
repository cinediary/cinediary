import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import type { SlideKind } from '../domain/story';

/**
 * Estado do Story (MA-05): slide atual e pausa. Quem conta o tempo é a barra do topo (StoryProgress):
 * quando ela enche, chama `next`. Antes havia um setTimeout separado da animação da barra, e os dois
 * se desencontravam: pausar parava só o timer, voltar deixava a barra cheia, retomar reiniciava os 6 s.
 * Com "Reduzir movimento" nada avança sozinho. Ao sair, registra match_story_viewed.
 */
export function useStoryPlayer(slides: SlideKind[], matchId: string, score: number | null, onClose: () => void) {
  const [index, setIndex] = useState(0);
  // Sobe a cada "recomeçar este slide" (voltar no primeiro): a barra e as animações do slide reiniciam.
  const [round, setRound] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const maxViewed = useRef(0);
  const total = slides.length;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    maxViewed.current = Math.max(maxViewed.current, index + 1);
  }, [index]);

  // match_story_viewed quando o Story fecha.
  useEffect(
    () => () => {
      if (!matchId || maxViewed.current === 0) return;
      analytics.track('match_story_viewed', {
        match_id: matchId,
        compatibility_score: score,
        slides_viewed_count: maxViewed.current,
      });
    },
    [matchId, score],
  );

  // Fecha uma vez só: se a barra do último slide acabar junto com um toque, o router.back() rodaria duas vezes
  // e tiraria também a tela de baixo.
  const closed = useRef(false);
  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  }, [onClose]);

  // Como no Instagram: avançar no último fecha (tocando ou quando a barra dele enche); voltar no primeiro
  // recomeça o slide. Antes os dois ficavam parados (o índice só era limitado entre 0 e o último).
  const next = useCallback(() => {
    if (index >= total - 1) close();
    else setIndex(index + 1);
  }, [index, total, close]);
  const prev = useCallback(() => {
    if (index === 0) setRound((r) => r + 1);
    else setIndex(index - 1);
  }, [index]);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return {
    index,
    round,
    kind: slides[index],
    total,
    paused,
    reduceMotion,
    /** A barra do slide atual está andando. */
    running: !paused && !reduceMotion && total > 0,
    next,
    prev,
    pause,
    resume,
  };
}
