import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ActionSheet, Avatar, Button, markImageBroken, Skeleton, Text, TextField, useToast, useWorkingImageUrl } from '@/shared/ui';
import { fonts, palette, radius, semantic, space, touch, type as typeScale } from '@/shared/theme';
import { Camera, CaretDown, EnvelopeSimple, ImageSquare, Trash } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { strings } from '@/shared/i18n';
import { nav } from '@/shared/ui/navigation/nav';
import { useState } from 'react';

import { isValidEmail, isValidUsername, normalizeUsername } from '../../domain/credentials';
import { useUsernameAvailability } from '../../application/useUsernameAvailability';
import { useEditProfile } from '../../application/useEditProfile';
import { useProfileHeader } from '../../application/profileHeader';
import { AuthFormLayout } from '../components/AuthFormLayout';
import { useMe } from '../../application/profileQueries';
import { BIO_MAX, isPronounCode, NAME_MAX, PRONOUN_CODES, type UserProfile } from '../../domain/profile';

/**
 * PE-02 · Editar perfil (tela inteira, aberta pelo "Editar perfil" do Perfil). Foto e e-mail salvam na hora
 * (cada um com o próprio passo); nome e @ vão juntos no "Salvar alterações", fixo acima do teclado.
 */
export function EditProfileScreen() {
  const me = useMe();
  const a = strings.account;
  if (!me.data) {
    return (
      <AuthFormLayout title={a.editTitle} subtitle={a.editSubtitle} footer={<Button label={a.save} disabled />}>
        <View style={styles.center}>
          <Skeleton width={104} height={104} round />
        </View>
        <Skeleton width="100%" height={52} radius={12} />
        <Skeleton width="100%" height={52} radius={12} />
      </AuthFormLayout>
    );
  }
  // key: se o perfil mudar por fora (ex.: puxar para atualizar), o rascunho recomeça dele.
  return <EditProfileForm key={me.data.id} profile={me.data} />;
}

function EditProfileForm({ profile }: { profile: UserProfile }) {
  const a = strings.account;
  const au = strings.auth;
  const toast = useToast();
  const edit = useEditProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  // Código da lista (ou vazio = não mostrar). Um texto antigo, de antes da lista, aparece como "não mostrar".
  const [pronouns, setPronouns] = useState<string>(isPronounCode(profile.pronouns) ? profile.pronouns : '');
  const [pickingPronouns, setPickingPronouns] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? '');

  // @: confere ao sair do campo (como no cadastro), só se mudou.
  const [checkedName, setCheckedName] = useState<string | null>(null);
  const availability = useUsernameAvailability(checkedName);
  const normalized = normalizeUsername(username);
  const usernameChanged = normalized !== profile.username;
  const showsCheck = usernameChanged && checkedName === username;
  const taken = showsCheck && availability.data?.available === false;
  const available = showsCheck && availability.data?.available === true;
  const usernameError = usernameChanged && username && !isValidUsername(username) ? au.usernameInvalid : taken ? au.usernameTaken : null;
  const nameError = displayName.trim().length === 0 || displayName.trim().length > 100 ? a.nameInvalid : null;

  const changed =
    usernameChanged ||
    displayName.trim() !== profile.displayName ||
    firstName.trim() !== (profile.firstName ?? '') ||
    lastName.trim() !== (profile.lastName ?? '') ||
    pronouns.trim() !== (profile.pronouns ?? '') ||
    bio.trim() !== (profile.bio ?? '');
  const canSave = changed && !usernameError && !nameError && edit.busy === null;

  const onSave = async () => {
    if (!canSave) return;
    const ok = await edit.saveProfile(profile, { displayName, username, firstName, lastName, pronouns, bio });
    if (ok) {
      toast(a.saved);
      nav.back();
    }
  };

  return (
    <AuthFormLayout
      title={a.editTitle}
      subtitle={a.editSubtitle}
      footer={<Button label={a.save} loading={edit.busy === 'profile'} disabled={!canSave} onPress={onSave} />}
    >
      <PhotoPicker profile={profile} edit={edit} />
      <CoverSection profile={profile} />

      <Text variant="overline" tone="secondary" accessibilityRole="header">
        {a.sectionIdentity}
      </Text>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField
            label={a.firstName}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            textContentType="givenName"
            maxLength={NAME_MAX}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label={a.lastName}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            textContentType="familyName"
            maxLength={NAME_MAX}
          />
        </View>
      </View>
      <TextField
        label={au.username}
        value={username}
        onChangeText={(v) => setUsername(v.replace(/\s/g, '').toLowerCase())}
        onBlur={() => {
          if (usernameChanged && isValidUsername(username)) setCheckedName(username);
        }}
        placeholder={au.usernamePlaceholder}
        hint={showsCheck && availability.isFetching ? au.usernameChecking : au.usernameHint}
        checking={showsCheck && availability.isFetching}
        success={available ? au.usernameAvailable(normalized) : null}
        error={usernameError}
        autoCapitalize="none"
        textContentType="username"
      />

      <Text variant="overline" tone="secondary" accessibilityRole="header">
        {a.sectionPublic}
      </Text>
      <TextField
        label={a.displayName}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={a.namePlaceholder}
        hint={a.displayNameHint}
        error={nameError}
        autoCapitalize="words"
        textContentType="nickname"
        maxLength={NAME_MAX}
      />
      {/* Pronomes: só opções (sem escrever), escolhidas no menu. */}
      <View style={styles.field}>
        <Text variant="bodyStrong" tone="secondary">
          {a.pronouns}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${a.pronouns}: ${pronouns ? a.pronounOptions[pronouns] : a.pronounNone}`}
          onPress={() => setPickingPronouns(true)}
          style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}
        >
          <Text style={[styles.flex, !pronouns && styles.placeholder]}>{pronouns ? a.pronounOptions[pronouns] : a.pronounNone}</Text>
          <CaretDown size={18} color={palette.ink500} />
        </Pressable>
      </View>
      <ActionSheet
        visible={pickingPronouns}
        title={a.pronouns}
        onClose={() => setPickingPronouns(false)}
        options={[
          ...PRONOUN_CODES.map((code) => ({
            key: code,
            label: a.pronounOptions[code] ?? code,
            selected: pronouns === code,
            onPress: () => setPronouns(code),
          })),
          { key: 'none', label: a.pronounNone, selected: !pronouns, onPress: () => setPronouns('') },
        ]}
      />
      <View style={styles.field}>
        <Text variant="bodyStrong" tone="secondary">
          {a.bio}
        </Text>
        <TextInput
          style={styles.bio}
          value={bio}
          onChangeText={setBio}
          placeholder={a.bioPlaceholder}
          placeholderTextColor={palette.ink500}
          accessibilityLabel={a.bio}
          maxLength={BIO_MAX}
          multiline
        />
        <Text variant="caption" tone="muted" style={styles.count}>
          {a.textCount(bio.length, BIO_MAX)}
        </Text>
      </View>

      <EmailSection edit={edit} />

      {edit.error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {edit.error}
        </Text>
      ) : null}
    </AuthFormLayout>
  );
}

type Edit = ReturnType<typeof useEditProfile>;

/** Foto grande no topo: tocar abre as opções (galeria, câmera, remover). */
function PhotoPicker({ profile, edit }: { profile: UserProfile; edit: Edit }) {
  const a = strings.account;
  const toast = useToast();
  const busy = edit.busy === 'photo';

  const pick = async (source: 'library' | 'camera') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    };
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return void toast(a.cameraPermission);
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;
    const ok = await edit.setPhoto(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`, source);
    if (ok) toast(a.photoUpdated);
  };

  const remove = async () => {
    const ok = await edit.removePhoto();
    if (ok) toast(a.photoRemoved);
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const openOptions = () => setMenuOpen(true);

  return (
    <View style={styles.center}>
      <Pressable accessibilityRole="button" accessibilityLabel={a.changePhoto} onPress={openOptions} disabled={busy}>
        <Avatar name={profile.displayName || profile.username} imageUrl={profile.avatarUrl} size={104} />
        {busy ? (
          <View style={styles.photoBusy}>
            <ActivityIndicator color={palette.surface} />
          </View>
        ) : null}
        <View style={styles.cameraBadge}>
          <Camera size={18} color={semantic.onPrimary} weight="fill" />
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={openOptions} disabled={busy} hitSlop={8}>
        <Text variant="bodyStrong" tone="link">
          {a.changePhoto}
        </Text>
      </Pressable>
      <ActionSheet
        visible={menuOpen}
        title={a.changePhoto}
        onClose={() => setMenuOpen(false)}
        options={[
          {
            key: 'library',
            label: a.photoFromLibrary,
            icon: <ImageSquare size={20} color={palette.ink900} />,
            onPress: () => void pick('library'),
          },
          {
            key: 'camera',
            label: a.photoFromCamera,
            icon: <Camera size={20} color={palette.ink900} />,
            onPress: () => void pick('camera'),
          },
          ...(profile.avatarUrl
            ? [
                {
                  key: 'remove',
                  label: a.removePhoto,
                  destructive: true,
                  icon: <Trash size={20} color={semantic.danger} />,
                  onPress: () => void remove(),
                },
              ]
            : []),
        ]}
      />
    </View>
  );
}

/**
 * Capa do perfil: uma cena (backdrop do TMDB) de um filme ou série. Escolher abre a tela de busca + cenas;
 * remover salva na hora. Não tem upload: a imagem fica no TMDB.
 */
function CoverSection({ profile }: { profile: UserProfile }) {
  const a = strings.account;
  const toast = useToast();
  const { remove } = useProfileHeader();
  // Capa que não carrega: a prévia fica vazia (dá para trocar ou remover normalmente).
  const preview = useWorkingImageUrl(profile.headerUrl);
  const open = () => nav.push('/profile/header');
  const onRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => toast(a.coverRemoved),
      onError: () => toast(a.coverError),
    });

  return (
    <View style={styles.field}>
      <Text variant="bodyStrong" tone="secondary">
        {a.cover}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={profile.headerUrl ? a.coverChange : a.coverChoose}
        onPress={open}
        // Enquanto a remoção não termina, não abre o seletor (uma capa nova poderia ser sobrescrita por ela).
        disabled={remove.isPending}
        style={({ pressed }) => [styles.cover, preview ? null : styles.coverEmptyFrame, pressed && styles.selectPressed]}
      >
        {preview ? (
          <>
            <Image
              source={{ uri: preview }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              onError={() => markImageBroken(preview)}
            />
            {/* Contorno por cima da foto, no mesmo raio: a borda de antes ficava por fora, a foto por dentro
                dela com cantos de outro raio, e sobrava uma fresta clara entre as duas. */}
            <View pointerEvents="none" style={styles.coverOutline} />
          </>
        ) : (
          // Sem capa, a própria moldura é o botão: ícone, a ação e a explicação, centralizados.
          <View style={styles.coverEmpty}>
            <ImageSquare size={26} color={palette.terracota500} weight="duotone" />
            <Text variant="bodyStrong" tone="link">
              {a.coverChoose}
            </Text>
            <Text variant="caption" tone="muted" style={styles.coverHint}>
              {a.coverHint}
            </Text>
          </View>
        )}
      </Pressable>
      {/* Com capa: trocar e remover numa linha só, com respiro da foto (antes colados nela, a 4 px). */}
      {profile.headerUrl ? (
        <View style={styles.coverActions}>
          <View style={styles.flex}>
            <Button label={a.coverChange} size="sm" variant="secondary" disabled={remove.isPending} onPress={open} />
          </View>
          <View style={styles.flex}>
            <Button label={a.coverRemove} size="sm" variant="danger" loading={remove.isPending} onPress={onRemove} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * E-mail da conta (login). Trocar pede o código que o Clerk manda para o endereço novo: só depois de
 * confirmado ele vira o principal e o antigo sai.
 */
function EmailSection({ edit }: { edit: Edit }) {
  const a = strings.account;
  const toast = useToast();
  const [step, setStep] = useState<'view' | 'enter' | 'code'>('view');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailId, setEmailId] = useState<string | null>(null);
  const busy = edit.busy === 'email';

  const reset = () => {
    if (emailId) void edit.cancelEmailChange(emailId);
    setStep('view');
    setNewEmail('');
    setCode('');
    setEmailId(null);
    edit.clearError();
  };

  const send = async () => {
    const id = await edit.startEmailChange(newEmail);
    if (id) {
      setEmailId(id);
      setStep('code');
    }
  };

  const confirm = async () => {
    if (!emailId) return;
    const ok = await edit.confirmEmailChange(emailId, code);
    if (ok) {
      toast(a.emailUpdated);
      setEmailId(null);
      setStep('view');
      setNewEmail('');
      setCode('');
    }
  };

  return (
    <View style={styles.emailBox}>
      <View style={styles.emailRow}>
        <EnvelopeSimple size={20} color={palette.ink700} />
        <View style={styles.flex}>
          <Text variant="caption" tone="muted">
            {a.email}
          </Text>
          <Text variant="bodyStrong" numberOfLines={1}>
            {edit.email}
          </Text>
        </View>
        {step === 'view' ? (
          <Pressable accessibilityRole="button" onPress={() => setStep('enter')} hitSlop={8} style={styles.pill}>
            <Text variant="caption" style={styles.pillText}>
              {a.emailChange}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {step === 'enter' ? (
        <>
          <TextField
            label={a.emailNew}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder={strings.auth.emailPlaceholder}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoFocus
          />
          <Button label={a.emailSendCode} size="sm" loading={busy} disabled={!isValidEmail(newEmail)} onPress={send} />
          <Button label={a.emailCancel} size="sm" variant="ghost" disabled={busy} onPress={reset} />
        </>
      ) : step === 'code' ? (
        <>
          <Text variant="caption" tone="secondary">
            {a.emailCodeSent(newEmail.trim())}
          </Text>
          <TextField
            label={a.emailCode}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
          />
          <Button label={a.emailConfirm} size="sm" loading={busy} disabled={code.length !== 6} onPress={confirm} />
          <Button label={a.emailCancel} size="sm" variant="ghost" disabled={busy} onPress={reset} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.sm },
  pair: { flexDirection: 'row', gap: space.md },
  field: { gap: space.xs },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.buttonHeight,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
  },
  selectPressed: { backgroundColor: palette.surfaceSunken },
  placeholder: { color: palette.ink500 },
  bio: {
    ...typeScale.body,
    minHeight: 96,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    color: palette.ink900,
    textAlignVertical: 'top',
  },
  count: { textAlign: 'right' },
  cover: { aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: palette.surfaceSunken },
  // Sem capa: a moldura de "escolha aqui".
  coverEmptyFrame: { borderWidth: 1.5, borderColor: palette.borderStrong, backgroundColor: palette.surface },
  coverOutline: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: semantic.imageOutline,
  },
  coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingHorizontal: space.xl },
  coverHint: { textAlign: 'center', marginTop: 2 },
  // 16 px da foto (4 do campo + 12), na grade de 8 do iOS; 12 entre os dois botões.
  coverActions: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  flex: { flex: 1 },
  photoBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: 52,
    backgroundColor: 'rgba(42,33,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.primary,
    borderWidth: 3,
    borderColor: semantic.background,
  },
  emailBox: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  pillText: { color: palette.ink900, fontFamily: fonts.bodyHeavy },
});
