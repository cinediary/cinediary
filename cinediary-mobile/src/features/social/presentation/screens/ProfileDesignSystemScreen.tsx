import { View, useWindowDimensions } from 'react-native';

import { space, makeStyles } from '@/shared/theme';
import { Button, Screen, Text } from '@/shared/ui';
import { ProfileHeader } from '../components/ProfileHeader';

/** Capas de exemplo (cenas do TMDB): uma clara, uma escura e uma de meio-termo. */
const COVERS = [
  { key: 'light', label: 'Clara · Barbie', path: '/1esAE8sLJRWWFsLLeh5r3g2WanI.jpg' },
  { key: 'dark', label: 'Escura · Batman', path: '/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg' },
  { key: 'mid', label: 'Média · Blade Runner', path: '/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg' },
] as const;

/** Espaço do relógio simulado em cima da capa, como na tela de verdade. */
const BLEED = 48;
const CANVAS_HEIGHT = 620;

/**
 * Design System do perfil (só em desenvolvimento): o topo do perfil com capa em fotos clara, escura e de
 * meio-termo, para conferir o fim suave da capa. Cada prévia desenha no tamanho da tela e reduz.
 */
export function ProfileDesignSystemScreen() {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const previewW = (width - space.screenX * 2 - space.md) / 2;
  const scale = previewW / width;

  return (
    <Screen scroll edges={[]}>
      <Text variant="overline" tone="muted">
        Capa do perfil
      </Text>
      <View style={styles.grid}>
        {COVERS.map((c) => (
          <View key={c.key} style={[styles.cell, { width: previewW }]}>
            <View style={[styles.preview, { width: previewW, height: CANVAS_HEIGHT * scale }]}>
              <View style={[styles.canvas, { width, height: CANVAS_HEIGHT, paddingTop: BLEED, transform: [{ scale }] }]}>
                <ProfileHeader
                  name="Edu Dantas"
                  username="edu"
                  avatarUrl={null}
                  headerUrl={`https://image.tmdb.org/t/p/w780${c.path}`}
                  coverBleedTop={BLEED}
                  pronouns="he"
                  bio="Cinéfilo de fim de semana. Terror, drama e tudo que a Greta Gerwig fizer."
                  isPrivate={false}
                  titles={1998}
                  followers={128}
                  following={96}
                  canOpenLists={false}
                  actions={<Button label="Editar perfil" variant="secondary" onPress={() => {}} />}
                />
              </View>
            </View>
            <Text variant="caption" tone="muted">
              {c.label}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { gap: space.xs, paddingBottom: space.md },
  preview: { borderRadius: 18, overflow: 'hidden', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border },
  canvas: { transformOrigin: 'top left', paddingHorizontal: space.screenX, backgroundColor: c.bg, overflow: 'hidden' },
}));
