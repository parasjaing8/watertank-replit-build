import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

export default function Index() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#0A1628' : '#FFFFFF';
  const [target, setTarget] = useState<'onboarding' | 'tabs' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done')
      .then((v) => setTarget(v === '1' ? 'tabs' : 'onboarding'))
      .catch(() => setTarget('tabs'));
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: bg }} />;
  if (target === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
