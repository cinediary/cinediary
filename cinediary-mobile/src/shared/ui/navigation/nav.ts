import { router, type Href } from 'expo-router';

/**
 * Tempo em que um segundo toque é ignorado. A animação de abrir uma tela leva ~350 ms: enquanto ela não termina,
 * a tela antiga continua na frente e recebe os toques, e cada um empilhava uma tela nova (3 toques em "Seguindo"
 * abriam 3 telas de Seguindo). Passado esse tempo libera sozinho, então voltar e tocar de novo abre normal.
 */
const WINDOW_MS = 600;

/**
 * Uma trava para abrir e outra para voltar: tocar voltar logo depois de abrir não é toque repetido, e
 * voltar duas vezes seguidas (o segundo toque cai no voltar da tela de baixo) fecharia duas telas.
 */
function guarded<A extends unknown[]>(fn: (...args: A) => void) {
  let lockedUntil = 0;
  return (...args: A) => {
    const now = Date.now();
    if (now < lockedUntil) return;
    lockedUntil = now + WINDOW_MS;
    fn(...args);
  };
}

const open = guarded((go: () => void) => go());

/**
 * O `router` do expo-router protegido contra toque repetido. Use no lugar de `router.push`/`router.navigate`
 * (o lint avisa). Vale para o app inteiro: um toque duplo em dois itens diferentes também abre uma tela só.
 */
export const nav = {
  push: (href: Href) => open(() => router.push(href)),
  navigate: (href: Href) => open(() => router.navigate(href)),
  /** Voltar; sem tela para voltar (ex.: abriu pelo link com o app fechado), vai para o Início. */
  back: guarded(() => (router.canGoBack() ? router.back() : router.replace('/'))),
};
