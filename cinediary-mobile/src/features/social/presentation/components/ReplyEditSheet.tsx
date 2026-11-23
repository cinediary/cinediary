import { strings } from '@/shared/i18n';
import { TextEditSheet, useToast } from '@/shared/ui';
import { useEditReply } from '../../application/entryConversation';
import { REPLY_MAX, type EntryComment } from '../../domain/social';

/**
 * Editar a sua resposta: a folha colada no teclado (TextEditSheet). Otimista: a resposta já muda na lista, com
 * "editado"; se o servidor recusar, volta e avisa. Renderize por último na tela da entrada.
 */
export function ReplyEditSheet({ entryId, comment, onClose }: { entryId: string; comment: EntryComment; onClose: () => void }) {
  const toast = useToast();
  const edit = useEditReply(entryId);
  return (
    <TextEditSheet
      title={strings.social.editReply}
      initialText={comment.text}
      maxLength={REPLY_MAX}
      placeholder={strings.social.replyPlaceholder}
      onSave={(text) => edit.mutate({ comment, text }, { onError: () => toast(strings.common.genericError) })}
      onClose={onClose}
    />
  );
}
