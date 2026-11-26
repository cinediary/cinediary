import * as Haptics from 'expo-haptics';
import { Heart } from 'phosphor-react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { touch, useColors } from '@/shared/theme';

export interface LikeButtonProps {
  liked: boolean;
  onToggle: (liked: boolean) => void;
}

export function LikeButton({ liked, onToggle }: LikeButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Curtido' : 'Curtir'}
      accessibilityState={{ selected: liked }}
      hitSlop={8}
      style={{ minWidth: touch.minTarget, minHeight: touch.minTarget, alignItems: 'center', justifyContent: 'center' }}
      onPress={() => {
        const next = !liked;
        if (next) {
          scale.set(withSequence(withSpring(1.25, { damping: 8 }), withSpring(1)));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onToggle(next);
      }}
    >
      <Animated.View style={animated}>
        <Heart size={28} weight={liked ? 'fill' : 'regular'} color={liked ? colors.liked : colors.ink400} />
      </Animated.View>
    </Pressable>
  );
}
