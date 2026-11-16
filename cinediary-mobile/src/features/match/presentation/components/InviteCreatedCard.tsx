import { Copy, ShareNetwork } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, party, radius, space } from '@/shared/theme';
import { Avatar, Button, Text, Title, useToast } from '@/shared/ui';
import { useInviteSharing } from '../../application/matchQueries';
import type { Match } from '../../domain/match';

/** MA-02 · Convite criado: preview do link, compartilhar e copiar. */
export function InviteCreatedCard({ match, onDone }: { match: Match; onDone: () => void }) {
  const t = strings.match;
  const toast = useToast();
  const sharing = useInviteSharing();

  return (
    <View style={styles.root}>
      <Title parts={t.inviteCreatedTitle} variant="h2" />
      <View style={styles.preview}>
        <View style={styles.avatars}>
          <Avatar name={match.creator.name} imageUrl={match.creator.avatarUrl} background={party.butter} borderColor={party.plum} />
          <View style={styles.overlap}>
            <Avatar name="?" background={party.blush} borderColor={party.plum} />
          </View>
        </View>
        <Text variant="h3" style={styles.cream}>
          {t.invitePreview(match.creator.name)}
        </Text>
        <Text variant="caption" style={styles.blush}>
          {match.inviteUrl}
        </Text>
      </View>
      <Button label={t.shareInvite} icon={<ShareNetwork size={20} color={palette.surface} />} onPress={() => void sharing.share(match)} />
      <Button
        label={t.copyLink}
        variant="secondary"
        icon={<Copy size={20} color={palette.ink900} />}
        onPress={() => void sharing.copy(match).then(() => toast(t.copied))}
      />
      <Button label={strings.common.close} variant="ghost" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  preview: {
    backgroundColor: party.plum,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.sm,
    transform: [{ rotate: '-1.5deg' }],
  },
  avatars: { flexDirection: 'row' },
  overlap: { marginLeft: -14 },
  cream: { color: party.cream },
  blush: { color: party.blush },
});
