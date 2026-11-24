import { CaretRight } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { MyTitlesShortcuts } from '@/features/diary/presentation/components/MyTitlesShortcuts';
import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { Screen, Text, Title } from '@/shared/ui';
import { FloatingBackButton, FLOATING_BACK_SPACE } from '@/shared/ui/navigation/FloatingBackButton';
import { openCoverScenes } from '../navigation/coverNavigation';

/**
 * Escolher a capa, passo 1: um filme ou série. Antes de digitar aparecem os títulos da própria pessoa, que
 * são os que ela mais provavelmente quer na capa: os favoritos do perfil e o que ela viu por último
 * (MyTitlesShortcuts). Depois, os populares da busca. Escolher um título abre as cenas dele numa tela própria
 * (o voltar de lá volta para cá).
 */
export function ProfileHeaderPickerScreen() {
  const a = strings.account;
  return (
    <View style={styles.root}>
      <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
        <View style={styles.header}>
          <Title parts={a.coverPickerTitle} />
          <Text tone="secondary">{a.coverPickerHint}</Text>
        </View>
        <CatalogSearchPanel
          context="profile_header"
          onOpen={openCoverScenes}
          onAction={openCoverScenes}
          placeholder={a.coverSearch}
          actionIcon={<CaretRight size={20} color={palette.ink500} />}
          actionLabel={(t) => a.coverPickScene(t.title)}
          idleHeader={<MyTitlesShortcuts onPick={openCoverScenes} labelFor={(t) => a.coverPickScene(t.title)} />}
        />
      </Screen>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: FLOATING_BACK_SPACE, gap: space.xl },
  header: { gap: space.sm },
});
