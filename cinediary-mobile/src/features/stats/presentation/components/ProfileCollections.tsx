import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';

import { ProfileTagCloud } from '@/features/diary/presentation/components/ProfileTagCloud';
import { ProfileListsRail, useProfileListsAction } from '@/features/lists/presentation/components/ProfileListsSection';
import { strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { Text, UnderlineTabs } from '@/shared/ui';

type Tab = 'lists' | 'tags';

/** As coleções do seu perfil em abas: Listas e Tags (#58). */
export function ProfileCollections({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>('lists');
  const listsAction = useProfileListsAction(username, true);
  const action = tab === 'lists' ? listsAction : null;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <UnderlineTabs
            tabs={[
              { value: 'lists', label: strings.lists.section },
              { value: 'tags', label: strings.diary.tagsTitle },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10}>
            <Text variant="caption" tone="link">
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Animated.View key={tab} entering={FadeIn.duration(200).easing(Easing.bezier(0.25, 0.1, 0.25, 1))} style={styles.root}>
        {tab === 'lists' ? <ProfileListsRail username={username} /> : <ProfileTagCloud />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
