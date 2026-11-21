import Constants from 'expo-constants';
import { ChatCircle, DownloadSimple, Eye, FilmSlate, Info, LockSimple, Palette, SignOut, UserCircle, UsersThree } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { analytics } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { ActionSheet, ListRow, Text, Title, useToast } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { nav } from '@/shared/ui/navigation/nav';
import { useMe, useUpdateProfile } from '../../application/profileQueries';
import { useSignOut } from '../../application/usePasswordAuth';

/**
 * Uma linha de configuração. Para criar uma opção nova, é só acrescentar um item numa das seções de
 * `useSections` (ação com seta, chave liga/desliga ou só informação).
 */
type SettingRow = {
  key: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  danger?: boolean;
};

type SettingSection = { key: string; title: string; rows: SettingRow[] };

const icon = (Icon: typeof UserCircle) => <Icon size={20} color={palette.ink700} />;

function useSections(openReplyPicker: () => void): SettingSection[] {
  const a = strings.account;
  const t = strings.stats;
  const toast = useToast();
  const me = useMe();
  const updateProfile = useUpdateProfile();

  return [
    {
      key: 'account',
      title: a.sectionAccount,
      rows: [
        { key: 'edit', icon: icon(UserCircle), label: a.editProfile, onPress: () => nav.push('/profile/edit') },
        {
          key: 'private',
          icon: icon(LockSimple),
          label: t.privateProfile,
          hint: t.privateHint,
          switchValue: me.data?.isPrivate ?? false,
          onSwitchChange: (isPrivate) => {
            analytics.track('setting_changed', { key: 'private_profile', value: isPrivate });
            updateProfile.mutate({ isPrivate }, { onError: () => toast(strings.common.genericError) });
          },
        },
      ],
    },
    {
      // Preferências da conta (valem em qualquer aparelho). Novas opções desse tipo entram aqui.
      key: 'preferences',
      title: a.sectionPreferences,
      rows: [
        {
          key: 'spoilers',
          icon: icon(Eye),
          label: a.showSpoilers,
          hint: a.showSpoilersHint,
          switchValue: me.data?.showSpoilers ?? false,
          onSwitchChange: (showSpoilers) => {
            analytics.track('setting_changed', { key: 'show_spoilers', value: showSpoilers });
            updateProfile.mutate({ showSpoilers }, { onError: () => toast(strings.common.genericError) });
          },
        },
        {
          key: 'replies',
          icon: icon(ChatCircle),
          label: a.replyPolicy,
          hint: `${a.replyPolicies[me.data?.defaultReplyPolicy ?? 'EVERYONE']} · ${a.replyPolicyHint}`,
          onPress: openReplyPicker,
        },
        {
          // "Vi com…": desligado, quem te marca num registro já aparece (sem você aceitar).
          key: 'approve-companions',
          icon: icon(UsersThree),
          label: a.approveCompanions,
          hint: a.approveCompanionsHint,
          switchValue: me.data?.approveCompanions ?? true,
          onSwitchChange: (approveCompanions) => {
            analytics.track('setting_changed', { key: 'approve_companions', value: approveCompanions });
            updateProfile.mutate({ approveCompanions }, { onError: () => toast(strings.common.genericError) });
          },
        },
      ],
    },
    {
      key: 'data',
      title: a.sectionData,
      rows: [{ key: 'import', icon: icon(DownloadSimple), label: t.importLetterboxd, onPress: () => nav.push('/import') }],
    },
    {
      key: 'about',
      title: a.sectionAbout,
      rows: [
        { key: 'version', icon: icon(Info), label: a.version, hint: Constants.expoConfig?.version ?? '–' },
        { key: 'tmdb', icon: icon(FilmSlate), label: a.tmdb, hint: strings.common.tmdbCredit },
        ...(__DEV__
          ? [{ key: 'design', icon: icon(Palette), label: t.designSystem, onPress: () => nav.push('/_dev/design-system') }]
          : []),
      ],
    },
  ];
}

/** Configurações (abertas pela engrenagem do Perfil): seções em cartões e "Sair" no fim. */
export function SettingsScreen() {
  const a = strings.account;
  const insets = useSafeAreaInsets();
  const signOut = useSignOut();
  const toast = useToast();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const [pickingReplies, setPickingReplies] = useState(false);
  const sections = useSections(() => setPickingReplies(true));
  const current = me.data?.defaultReplyPolicy ?? 'EVERYONE';

  const confirmSignOut = () =>
    Alert.alert(a.signOutConfirmTitle, a.signOutConfirmText, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.auth.signOut, style: 'destructive', onPress: signOut },
    ]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.sm + touch.minTarget + space.sm, paddingBottom: insets.bottom + space.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Title parts={a.settingsTitle} />
        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text variant="overline" tone="secondary" accessibilityRole="header">
              {section.title}
            </Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => (
                <View key={row.key} style={[styles.row, i > 0 && styles.divider]}>
                  <ListRow
                    icon={row.icon}
                    label={row.label}
                    hint={row.hint}
                    onPress={row.onPress}
                    switchValue={row.switchValue}
                    onSwitchChange={row.onSwitchChange}
                    danger={row.danger}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.card}>
          <View style={styles.row}>
            <ListRow icon={<SignOut size={20} color={semantic.danger} />} label={strings.auth.signOut} danger onPress={confirmSignOut} />
          </View>
        </View>
      </ScrollView>
      <FloatingBackButton />
      <ActionSheet
        visible={pickingReplies}
        title={a.replyPolicy}
        message={a.replyPolicyHint}
        onClose={() => setPickingReplies(false)}
        options={(['ME', 'FOLLOWING', 'EVERYONE'] as const).map((policy) => ({
          key: policy,
          label: a.replyPolicies[policy],
          hint: a.replyPolicyHints[policy],
          selected: current === policy,
          onPress: () => {
            analytics.track('setting_changed', { key: 'default_reply_policy', value: policy !== 'EVERYONE' });
            updateProfile.mutate({ defaultReplyPolicy: policy }, { onError: () => toast(strings.common.genericError) });
          },
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  content: { paddingHorizontal: space.screenX, gap: space.xl },
  section: { gap: space.sm },
  card: { borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  row: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
});
