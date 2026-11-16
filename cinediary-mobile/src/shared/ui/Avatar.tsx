import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/shared/theme';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  background?: string;
  borderColor?: string;
}

/**
 * Avatar redondo: a foto, se a pessoa enviou uma; senão, a inicial do nome em Fraunces.
 * A inicial fica sempre por baixo e a foto por cima: enquanto a foto carrega (ou se ela falhar) aparece
 * a inicial, e não um círculo vazio. Antes era uma ou outra, e o avatar "piscava" vazio.
 */
export function Avatar({ name, imageUrl, size = 44, background = palette.pipoca300, borderColor = palette.bg }: AvatarProps) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = !!imageUrl && imageUrl !== failedUrl;
  return (
    <View
      accessibilityLabel={name}
      style={[styles.root, { width: size, height: size, borderRadius: size / 2, backgroundColor: background, borderColor }]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42, lineHeight: size * 0.5 }]}>{initial}</Text>
      {showPhoto ? (
        <Image
          source={imageUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={imageUrl}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : null}
    </View>
  );
}

export interface AvatarPairProps {
  a: Omit<AvatarProps, 'size'>;
  b: Omit<AvatarProps, 'size'>;
  size?: number;
}

/** Dois avatares sobrepostos (cards do Match). */
export function AvatarPair({ a, b, size = 44 }: AvatarPairProps) {
  return (
    <View style={styles.pair}>
      <Avatar {...a} size={size} />
      <View style={{ marginLeft: -size * 0.32 }}>
        <Avatar background={palette.salvia300} {...b} size={size} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontFamily: 'Fraunces_700Bold_Italic', color: palette.ink900 },
  pair: { flexDirection: 'row', alignItems: 'center' },
});
