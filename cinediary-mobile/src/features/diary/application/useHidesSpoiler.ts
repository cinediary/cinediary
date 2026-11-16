import { useMe } from '@/features/auth/application/profileQueries';
import { hidesSpoiler, type DiaryEntry } from '../domain/diary';

/** A review desta entrada fica escondida para quem está vendo (spoiler de outra pessoa, sem "Mostrar spoilers")? */
export function useHidesSpoiler(entry: Pick<DiaryEntry, 'authorId' | 'containsSpoilers' | 'reviewText'>) {
  const me = useMe();
  return hidesSpoiler(entry, me.data?.id, me.data?.showSpoilers ?? false);
}
