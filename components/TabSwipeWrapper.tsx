import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';

const TAB_ROUTES = ['/(tabs)', '/(tabs)/records', '/(tabs)/settings'] as const;

interface Props {
  index: 0 | 1 | 2;
  children: React.ReactNode;
}

function navigate(idx: number) {
  const route = TAB_ROUTES[idx];
  if (route) router.replace(route as Parameters<typeof router.replace>[0]);
}

export function TabSwipeWrapper({ index, children }: Props) {
  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      const dx = e.translationX;
      const vx = e.velocityX;
      const goLeft = dx < -80 || vx < -400;
      const goRight = dx > 80 || vx > 400;
      if (goLeft && index < 2) runOnJS(navigate)(index + 1);
      else if (goRight && index > 0) runOnJS(navigate)(index - 1);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
