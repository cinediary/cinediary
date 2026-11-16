import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { strings } from '@/shared/i18n';
import { Button, Text, TextField, type TextFieldRef } from '@/shared/ui';
import { useSignUpWithPassword } from '../../application/usePasswordAuth';
import { useUsernameAvailability } from '../../application/useUsernameAvailability';
import { canSubmitSignUp, isValidEmail, isValidUsername } from '../../domain/credentials';
import { AuthFormLayout } from '../components/AuthFormLayout';

type Field = 'username' | 'email';

/** AU-01b · Criar conta (usuário, e-mail e senha; sem verificação no MVP). */
export function SignUpScreen() {
  const a = strings.auth;
  const { submit, error, loading } = useSignUpWithPassword();
  const [username, setUsername] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  // A validação aparece ao sair do campo, nunca enquanto a pessoa digita (UX-02).
  const [touched, setTouched] = useState<Record<Field, boolean>>({ username: false, email: false });
  // Disponibilidade: verificada quando a pessoa sai do campo com um nome válido (nunca a cada letra).
  const [checkedName, setCheckedName] = useState<string | null>(null);
  const availability = useUsernameAvailability(checkedName);
  const showsCheck = checkedName !== null && checkedName === username;
  const taken = showsCheck && availability.data?.available === false && availability.data.reason === 'TAKEN';
  const available = showsCheck && availability.data?.available === true;
  const emailRef = useRef<TextFieldRef>(null);
  const passwordRef = useRef<TextFieldRef>(null);

  const input = { username, emailAddress, password };
  const canSubmit = canSubmitSignUp(input) && !taken;
  const onSubmit = () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    void submit(input);
  };
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  return (
    <AuthFormLayout
      title={a.signUpTitle}
      subtitle={a.signUpSubtitle}
      footer={
        <>
          <Button label={a.createAccount} loading={loading} disabled={!canSubmit} onPress={onSubmit} />
          <Button label={a.haveAccount} variant="ghost" disabled={loading} onPress={() => router.replace('/(auth)/sign-in')} />
        </>
      }
    >
      <TextField
        label={a.username}
        value={username}
        onChangeText={(v) => setUsername(v.replace(/\s/g, '').toLowerCase())}
        onBlur={() => {
          blur('username')();
          if (isValidUsername(username)) setCheckedName(username);
        }}
        placeholder={a.usernamePlaceholder}
        hint={showsCheck && availability.isFetching ? a.usernameChecking : a.usernameHint}
        checking={showsCheck && availability.isFetching}
        success={available ? a.usernameAvailable(username) : null}
        error={touched.username && username && !isValidUsername(username) ? a.usernameInvalid : taken ? a.usernameTaken : null}
        autoCapitalize="none"
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        autoFocus
      />
      <TextField
        ref={emailRef}
        label={a.email}
        value={emailAddress}
        onChangeText={setEmailAddress}
        onBlur={blur('email')}
        placeholder={a.emailPlaceholder}
        error={touched.email && emailAddress && !isValidEmail(emailAddress) ? a.emailInvalid : null}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label={a.password}
        secure
        value={password}
        onChangeText={setPassword}
        hint={a.passwordHint}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      {error && (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </AuthFormLayout>
  );
}
