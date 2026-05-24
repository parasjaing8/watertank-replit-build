import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.35, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 650, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ])).start();
  }, []);
  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.3, 0] });
  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 8, height: 8, borderRadius: 4,
        backgroundColor: color, transform: [{ scale: ringScale }], opacity: ringOpacity,
      }} />
      <Animated.View style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: color, transform: [{ scale: pulse }],
      }} />
    </View>
  );
}

export function SearchingDots({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1,   duration: 380, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        Animated.delay(760 - delay),
      ]));
    const anim = Animated.parallel([loop(a, 0), loop(b, 380), loop(c, 760)]);
    anim.start();
    return () => anim.stop();
  }, []);
  const dot = (val: Animated.Value) => (
    <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: val }} />
  );
  return (
    <View style={{ flexDirection: 'row', gap: 5, marginTop: 10 }}>
      {dot(a)}{dot(b)}{dot(c)}
    </View>
  );
}
