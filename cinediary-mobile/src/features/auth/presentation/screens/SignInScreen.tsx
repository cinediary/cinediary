import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { strings } from '@/shared/i18n';
import { Button, Text, TextField, type TextFieldRef } from '@/shared/ui';
import { useSignInWithPassword } from '../../application/usePasswordAuth';
import { AuthFormLayout } from '../components/AuthFormLayout';

/** AU-01c · Entrar com e-mail ou usuário + senha. */
export function SignInScreen() {
  const a = strings.auth;
  const { submit, error, loading } = useSignInWithPassword();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextFieldRef>(null);

  const canSubmit = identifier.trim().length > 0 && password.length > 0;
  const onSubmit = () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    void submit(identifier, password);
  };

  return (
    <AuthFormLayout
      title={a.signInTitle}
      subtitle={a.signInSubtitle}
      footer={
        <>
          <Button label={a.signIn} loading={loading} disabled={!canSubmit} onPress={onSubmit} />
          <Button label={a.noAccount} variant="ghost" disabled={loading} onPress={() => router.replace('/(auth)/sign-up')} />
        </>
      }
    >
      <TextField
        label={a.identifier}
        value={identifier}
        onChangeText={setIdentifier}
        placeholder={a.identifierPlaceholder}
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        autoFocus
      />
      <TextField
        ref={passwordRef}
        label={a.password}
        secure
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
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
