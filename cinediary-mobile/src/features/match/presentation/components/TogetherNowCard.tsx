import { UsersThree } from 'phosphor-react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { strings } from '@/shared/i18n';
import { palette } from '@/shared/theme';
import { Banner } from '@/shared/ui';
import { useRefetchOnFocus } from '@/shared/ui/navigation/useRefetchOnFocus';
import { useMatches } from '../../application/matchQueries';
import { otherPerson, type Match } from '../../domain/match';
import { openMatch } from '../navigation';

/** "Juntos agora" na Início: aparece só com Match ativo ou em construção. */
export function TogetherNowCard() {
  const me = useMe();
  const matches = useMatches();
  useRefetchOnFocus(matches.refetch);
  const match = matches.data?.find((m) => m.status === 'ACTIVE' || m.status === 'BUILDING');
  if (!match) return null;
  return <TogetherNowBanner match={match} meId={me.data?.id} />;
}

/** A faixa em si (sem buscar nada): a Início e o Design System do Match. */
export function TogetherNowBanner({ match, meId }: { match: Match; meId: string | undefined }) {
  const t = strings.diary;
  const name = otherPerson(match, meId)?.name ?? strings.match.pendingPartner;
  const message = match.status === 'ACTIVE' ? t.togetherLine(name, match.score ?? 0) : t.togetherBuilding(name);
  return (
    <Banner
      icon={<UsersThree size={20} color={palette.salvia700} />}
      message={`${t.togetherNow} · ${message}`}
      onPress={() => openMatch(match.id)}
    />
  );
}
