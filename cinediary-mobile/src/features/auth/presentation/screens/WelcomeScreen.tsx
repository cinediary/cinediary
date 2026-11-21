import { NotePencil, Star, Ticket, UsersThree } from 'phosphor-react-native';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShowcase } from '@/features/catalog/application/catalogQueries';
import { usePendingInvite } from '@/features/match/application/matchQueries';
import { strings } from '@/shared/i18n';
import { fonts, palette, radius, semantic, space } from '@/shared/theme';
import { Button, Text, Title } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { PosterWall, type WallPoster } from '../components/PosterWall';

/** Fallback tipográfico da parede (sem rede): só aparece até a vitrine chegar. */
const FALLBACK = ['Central do Brasil', 'Cidade de Deus', 'Bacurau', 'Ainda Estou Aqui', 'O Auto da Compadecida', 'Tropa de Elite'];
const FEATURE_ICONS = [NotePencil, Star, UsersThree] as const;

/** Entrada em cascata: cada bloco sobe um pouco depois do anterior. */
const enter = (i: number) => FadeInDown.duration(520).delay(180 + i * 90);

/**
 * AU-01a · Boas-vindas (com variante de convite). No topo, a parede de pôsteres populares no país do
 * aparelho, deslizando devagar e dissolvendo no creme; embaixo, num bloco creme sólido (o texto nunca passa
 * por cima dos pôsteres), a marca, o título, o que o app faz em três linhas e os botões. Vindo de um convite, um selo de "Taste Match" aparece acima do título.
 */
export function WelcomeScreen() {
  const a = strings.auth;
  const [brandA, brandB] = strings.match.story.brand;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { code } = usePendingInvite();
  const fromInvite = !!code;
  const showcase = useShowcase();
  const posters: WallPoster[] =
    showcase.data && showcase.data.length >= 4
      ? showcase.data.map((p) => ({ title: p.title, posterUrl: p.posterUrl }))
      : FALLBACK.map((title) => ({ title, posterUrl: null }));
  // Três faixas ocupando a parte de cima; aparelhos menores ganham pôsteres menores.
  const posterWidth = Math.round(Math.min(112, Math.max(80, (height * 0.5) / 3 / 1.5)));

  return (
    <View style={styles.root}>
      {/* A parede fica só na parte de cima (o que sobra acima do texto) e some no creme antes dele. */}
      <View style={styles.wall}>
        <PosterWall posters={posters} posterWidth={posterWidth} />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + space.md }]}>
        {fromInvite ? (
          <Animated.View entering={enter(0)} style={styles.badge}>
            <Ticket size={16} color={semantic.link} weight="fill" />
            <Text variant="caption" style={styles.badgeText}>
              {a.inviteBadge}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(0)}>
          <Text style={styles.brand} accessibilityRole="header" accessibilityLabel="CineDiary">
            {brandA}
            <Text style={[styles.brand, styles.brandItalic]}>{brandB}</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.copy}>
          <Title variant="h2" parts={fromInvite ? a.inviteTitle : a.welcomeTitle} />
          <Text tone="secondary">{fromInvite ? a.inviteSubtitle : a.welcomeSubtitle}</Text>
        </Animated.View>

        {!fromInvite ? (
          <Animated.View entering={enter(2)} style={styles.features}>
            {a.welcomeFeatures.map((label, i) => {
              const Icon = FEATURE_ICONS[i] ?? NotePencil;
              return (
                <View key={label} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <Icon size={18} color={semantic.link} />
                  </View>
                  <Text variant="caption" tone="secondary" style={styles.flex}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(3)} style={styles.actions}>
          <Button label={a.createAccount} onPress={() => nav.push('/(auth)/sign-up')} />
          <Button label={a.haveAccount} variant="ghost" onPress={() => nav.push('/(auth)/sign-in')} />
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <Text variant="caption" tone="muted" style={styles.center}>
            {a.terms}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  // Mínimo de parede visível mesmo em aparelho pequeno; o texto nunca fica por cima dos pôsteres.
  wall: { flex: 1, minHeight: 180 },
  content: { paddingHorizontal: space.screenX, paddingTop: space.sm, gap: space.lg, backgroundColor: semantic.background },
  flex: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.terracota100,
  },
  badgeText: { color: semantic.link, fontFamily: fonts.bodyHeavy },
  // A marca é o destaque da tela; o slogan (título) fica um degrau abaixo, em h2.
  brand: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: semantic.primary, letterSpacing: -0.5 },
  brandItalic: { fontFamily: fonts.displayItalic },
  copy: { gap: space.xs },
  features: { gap: space.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.terracota100,
  },
  actions: { gap: space.xs },
  center: { textAlign: 'center' },
});
