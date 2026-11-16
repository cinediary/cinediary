import { strings } from '@/shared/i18n';
import { Screen } from './Screen';
import { Text } from './Text';
import { Title } from './Title';

/** Exibida só quando .env.local não tem a chave pública do Clerk. */
export function MissingConfigScreen() {
  const t = strings.common.missingConfig;
  return (
    <Screen>
      <Title parts={t.title} />
      <Text tone="secondary">
        {t.body} <Text variant="bodyStrong">{t.command}</Text>.
      </Text>
    </Screen>
  );
}
