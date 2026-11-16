import { X, YoutubeLogo } from 'phosphor-react-native';
import { Linking, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { strings } from '@/shared/i18n';
import { palette, radius, space, touch } from '@/shared/theme';
import { Text } from '@/shared/ui';

/** Página mínima com o player do YouTube (sem os vídeos relacionados de outros canais no fim). */
const playerHtml = (key: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style>
</head><body><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&playsinline=1&rel=0&modestbranding=1"
allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;

/**
 * Trailer dentro do app: o player do YouTube embutido, por cima da página, sem sair do CineDiary.
 * Sem custo (o TMDB dá o código do vídeo e o YouTube permite embutir). Se o vídeo não puder ser
 * embutido (alguns canais bloqueiam), o botão "Abrir no YouTube" leva para o app/site do YouTube.
 */
export function TrailerPlayer({ youtubeKey, visible, onClose }: { youtubeKey: string; visible: boolean; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = Math.round((width * 9) / 16);
  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
          onPress={onClose}
          style={[styles.close, { top: insets.top + space.sm }]}
        >
          <X size={22} color={palette.surface} weight="bold" />
        </Pressable>
        <View style={{ width, height }}>
          {visible ? (
            <WebView
              source={{ html: playerHtml(youtubeKey), baseUrl: 'https://www.youtube-nocookie.com' }}
              style={styles.player}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              // Só o player: links para fora (logo, "assistir no YouTube") abrem no YouTube.
              onShouldStartLoadWithRequest={(req) => {
                // Toque num link para fora do player (logo, "assistir no YouTube"): abre no YouTube.
                if (req.navigationType === 'click' && !req.url.includes('/embed/')) {
                  void Linking.openURL(req.url);
                  return false;
                }
                return true;
              }}
            />
          ) : null}
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeKey)}`)}
          style={styles.youtube}
        >
          <YoutubeLogo size={20} color={palette.surface} weight="fill" />
          <Text variant="bodyStrong" style={styles.youtubeText}>
            {strings.catalog.trailerOpenYoutube}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', alignItems: 'center', gap: space.xl },
  player: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    right: space.screenX,
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  youtube: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    minHeight: touch.minTarget,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  youtubeText: { color: palette.surface },
});
