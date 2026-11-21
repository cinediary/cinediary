import { StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { AvatarPair, Button, Card, Text, Title } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useInviteSharing } from '../../application/matchQueries';
import { otherPerson, type Match } from '../../domain/match';
import { openMatch } from '../navigation';

/** Card do Hub Juntos nos 3 estados: PENDING, BUILDING e ACTIVE. */
export function MatchCard({ match, meId }: { match: Match; meId: string | undefined }) {
  const t = strings.match;
  const other = otherPerson(match, meId);
  const otherName = other?.name ?? t.pendingPartner;
  const meName = (match.creator.id === meId ? match.creator.name : match.partner?.name) ?? t.you;
  const avatars = (
    <AvatarPair
      a={{ name: meName, imageUrl: match.creator.id === meId ? match.creator.avatarUrl : match.partner?.avatarUrl }}
      b={{ name: other ? otherName : '?', imageUrl: other?.avatarUrl, background: palette.rosa300 }}
    />
  );
  const sharing = useInviteSharing();

  if (match.status === 'PENDING') {
    return (
      <Card dashed>
        <View style={styles.row}>
          {avatars}
          <View style={styles.flex}>
            <Title parts={t.pendingTitle} variant="h2" />
          </View>
        </View>
        <Text tone="secondary">{t.pendingText}</Text>
        <Text variant="caption" tone="muted">
          {t.codeLabel(match.inviteCode)}
        </Text>
        <Button label={t.resend} variant="secondary" size="sm" onPress={() => void sharing.share(match)} />
      </Card>
    );
  }

  if (match.status === 'BUILDING') {
    return (
      <Card onPress={() => openMatch(match.id)} accessibilityLabel={t.pair(otherName)}>
        <View style={styles.row}>
          {avatars}
          <Text variant="h3" style={styles.flex}>
            {t.pair(otherName)}
          </Text>
        </View>
        <Title parts={t.building} variant="h2" />
        <Text tone="secondary">{t.buildingText}</Text>
        <Button label={t.buildingCta} size="sm" onPress={() => nav.navigate('/(tabs)/log')} />
      </Card>
    );
  }

  return (
    <Card onPress={() => openMatch(match.id)} accessibilityLabel={`${t.pair(otherName)}, ${match.score ?? 0}%`}>
      <View style={styles.row}>
        {avatars}
        <View style={styles.flex}>
          <Text variant="h3">{t.pair(otherName)}</Text>
          {match.discoveryMode ? (
            <Text variant="caption" tone="muted">
              {t.discoveryBadge}
            </Text>
          ) : null}
        </View>
        <Text variant="display" style={styles.score}>
          {match.score ?? 0}%
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  score: { color: palette.terracota700 },
});
