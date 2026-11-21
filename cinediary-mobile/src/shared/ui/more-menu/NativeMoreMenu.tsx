import type { NativeMoreMenuProps } from './types';

/**
 * Sem menu nativo fora do iOS e do Android (web). O Metro usa o `.ios.tsx` ou o `.android.tsx`; este arquivo
 * existe para a web e para o TypeScript conhecer a assinatura.
 */
export function NativeMoreMenu(_props: NativeMoreMenuProps): null {
  return null;
}
