import { useState } from 'react';

import { strings } from '@/shared/i18n';
import { Button, OverlaySheet } from '@/shared/ui';
import type { Actor } from '../../domain/social';
import { CompanionPicker } from './CompanionPicker';

/**
 * "Vi com…" num cartão colado no teclado (a busca abre o teclado): escolher os amigos e "Pronto". Antes a lista
 * abria dentro do formulário e empurrava o resto para baixo.
 * Guarda a escolha enquanto está aberto e devolve em `onDone` ao fechar, por "Pronto", tocando fora ou pelo
 * voltar do Android: escolher amigos não é um texto que se perde, então qualquer saída mantém o que foi marcado.
 */
export function CompanionSheet({ selected, onDone, onClose }: { selected: Actor[]; onDone: (next: Actor[]) => void; onClose: () => void }) {
  const [picked, setPicked] = useState(selected);
  const done = () => {
    onDone(picked);
    onClose();
  };
  return (
    <OverlaySheet
      title={strings.social.companions.row}
      onClose={done}
      onBackdropPress={done}
      fixedHeight
      footer={<Button label={strings.common.done} onPress={done} fullWidth />}
    >
      <CompanionPicker selected={picked} onChange={setPicked} />
    </OverlaySheet>
  );
}
