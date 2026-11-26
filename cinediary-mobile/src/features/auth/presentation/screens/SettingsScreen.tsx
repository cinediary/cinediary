import Constants from 'expo-constants';
import { usePreventRemove } from 'expo-router';
import {
  BellSlash,
  ChatCircle,
  CircleHalf,
  DownloadSimple,
  Eye,
  FilmSlate,
  Heart,
  Info,
  LockSimple,
  Palette,
  SignOut,
  Trash,
  UserCircle,
  UserPlus,
  UsersThree,
} from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { analytics } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { usePushPreferences, useUpdatePushPreferences, type PushPreferences } from '@/shared/notifications/pushPreferences';
import { enablePush, usePushPermission, useRefreshPushPermissionOnForeground } from '@/shared/notifications/usePushPermission';
import { radius, space, useTheme, useColors, makeStyles } from '@/shared/theme';
import { ActionSheet, Button, ListRow, StarSpinner, Text, Title, useToast } from '@/shared/ui';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { nav } from '@/shared/ui/navigation/nav';
import { useMe, useUpdateProfile } from '../../application/profileQueries';
import { useDeleteAccount, useSignOut } from '../../application/usePasswordAuth';

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
  disabled?: boolean;
};

/** {@code header}: algo acima das linhas, no mesmo cartão (ex.: o aviso de notificações desativadas). */
type SettingSection = { key: string; title: string; header?: ReactNode; rows: SettingRow[] };

function SettingIcon({ Icon }: { Icon: typeof UserCircle }) {
  const colors = useColors();
  return <Icon size={20} color={colors.ink700} />;
}

const icon = (Icon: typeof UserCircle) => <SettingIcon Icon={Icon} />;

/** Sem a permissão do sistema: o porquê e o "Ativar" (pede ao sistema ou abre os Ajustes do aparelho). */
function PushOffBanner({ onEnable }: { onEnable: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  const a = strings.account;
  return (
    <View style={styles.banner}>
      <BellSlash size={22} color={colors.primary} />
      <View style={styles.bannerText}>
        <Text variant="bodyStrong">{a.pushOffTitle}</Text>
        <Text variant="caption" tone="muted">
          {a.pushOffText}
        </Text>
      </View>
      <Button label={a.pushEnable} size="sm" onPress={onEnable} />
    </View>
  );
}

/**
 * Os tipos de push (#15). Sem a permissão do sistema, as chaves ficam apagadas e o aviso em cima explica; voltar
 * dos Ajustes com a permissão ligada acende tudo na hora.
 */
function useNotificationsSection(): SettingSection {
  const a = strings.account;
  const toast = useToast();
  const permission = usePushPermission();
  const preferences = usePushPreferences();
  const update = useUpdatePushPreferences();
  const granted = permission.data === 'granted';

  const row = (key: keyof PushPreferences, Icon: typeof UserCircle, label: string, hint: string): SettingRow => ({
    key: `push-${key}`,
    icon: icon(Icon),
    label,
    hint,
    switchValue: preferences.data?.[key] ?? true,
    disabled: !granted,
    onSwitchChange: (value) => {
      analytics.track('setting_changed', { key: `push_${key}`, value });
      update.mutate({ [key]: value }, { onError: () => toast(strings.common.genericError) });
    },
  });

  return {
    key: 'notifications',
    title: a.sectionNotifications,
    header: permission.data && !granted ? <PushOffBanner onEnable={() => void enablePush(permission.data)} /> : undefined,
    rows: [
      row('followers', UserPlus, a.pushFollowers, a.pushFollowersHint),
      row('likes', Heart, a.pushLikes, a.pushLikesHint),
      row('replies', ChatCircle, a.pushReplies, a.pushRepliesHint),
      row('companions', UsersThree, a.pushCompanions, a.pushCompanionsHint),
    ],
  };
}

function useSections(openReplyPicker: () => void, openAppearancePicker: () => void): SettingSection[] {
  const a = strings.account;
  const t = strings.stats;
  const toast = useToast();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const { preference } = useTheme();
  const notifications = useNotificationsSection();

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
          // Do aparelho (não da conta): cada celular guarda a sua
          key: 'appearance',
          icon: icon(CircleHalf),
          label: a.appearance,
          hint: a.appearances[preference],
          onPress: openAppearancePicker,
        },
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
    notifications,
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
  const styles = useStyles();
  const colors = useColors();
  const a = strings.account;
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const signOut = useSignOut();
  const toast = useToast();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount({ onError: () => toast(a.deleteAccountError) });
  const [pickingReplies, setPickingReplies] = useState(false);
  const [pickingAppearance, setPickingAppearance] = useState(false);
  const { preference, setPreference } = useTheme();
  useRefreshPushPermissionOnForeground();
  const sections = useSections(
    () => setPickingReplies(true),
    () => setPickingAppearance(true),
  );
  const current = me.data?.defaultReplyPolicy ?? 'EVERYONE';

  const confirmSignOut = () =>
    Alert.alert(a.signOutConfirmTitle, a.signOutConfirmText, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.auth.signOut, style: 'destructive', onPress: signOut },
    ]);

  // Igual ao "Sair": o alerta nativo, com o botão de excluir em vermelho
  const confirmDeleteAccount = () =>
    Alert.alert(a.deleteAccountTitle, a.deleteAccountText, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: a.deleteAccountConfirm, style: 'destructive', onPress: () => deleteAccount.mutate() },
    ]);

  usePreventRemove(deleteAccount.isPending, () => undefined);

  return (
    <View style={styles.root}>
      {/* Excluindo: a tela de espera cobre tudo, e o leitor de tela (TalkBack e VoiceOver) também não alcança o fundo */}
      <View
        style={styles.fill}
        importantForAccessibility={deleteAccount.isPending ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={deleteAccount.isPending}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: backInset, paddingBottom: insets.bottom + space.xl },
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
                {section.header ? <View style={styles.row}>{section.header}</View> : null}
                {section.rows.map((row, i) => (
                  <View key={row.key} style={[styles.row, (i > 0 || section.header !== undefined) && styles.divider]}>
                    <ListRow
                      icon={row.icon}
                      label={row.label}
                      hint={row.hint}
                      onPress={row.onPress}
                      switchValue={row.switchValue}
                      onSwitchChange={row.onSwitchChange}
                      danger={row.danger}
                      disabled={row.disabled}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
          <View style={styles.card}>
            <View style={styles.row}>
              <ListRow icon={<SignOut size={20} color={colors.danger} />} label={strings.auth.signOut} danger onPress={confirmSignOut} />
            </View>
          </View>
          {/* No fim da tela, longe do que se usa no dia a dia */}
          <View style={styles.card}>
            <View style={styles.row}>
              <ListRow
                icon={<Trash size={20} color={colors.danger} />}
                label={a.deleteAccount}
                danger
                onPress={deleteAccount.isPending ? undefined : confirmDeleteAccount}
              />
            </View>
          </View>
        </ScrollView>
        <FloatingBackButton />
      </View>
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
      <ActionSheet
        visible={pickingAppearance}
        title={a.appearance}
        onClose={() => setPickingAppearance(false)}
        options={(['system', 'light', 'dark'] as const).map((choice) => ({
          key: choice,
          label: a.appearances[choice],
          hint: a.appearanceHints[choice],
          selected: preference === choice,
          onPress: () => {
            analytics.track('setting_changed', { key: 'appearance', value: choice });
            setPreference(choice);
          },
        }))}
      />
      {deleteAccount.isPending ? (
        <View style={styles.blocking} accessibilityViewIsModal>
          <StarSpinner />
          <Text variant="bodyStrong">{a.deleteAccountPending}</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: space.screenX, gap: space.xl },
  section: { gap: space.sm },
  card: { borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  row: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  fill: { flex: 1 },
  blocking: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: c.background,
    opacity: 0.94,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  bannerText: { flex: 1, gap: 2 },
}));
