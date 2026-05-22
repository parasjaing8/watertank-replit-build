import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import {
  NotoSansKannada_400Regular,
  NotoSansKannada_700Bold,
} from '@expo-google-fonts/noto-sans-kannada';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DeviceProvider } from '@/context/DeviceContext';
import { LanguageProvider } from '@/context/LanguageContext';
import * as NotificationService from '@/services/NotificationService';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="help" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#0A1628' : '#FFFFFF';

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_700Bold,
    NotoSansKannada_400Regular,
    NotoSansKannada_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    NotificationService.requestPermissions();
  }, []);

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: bg }} />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <DeviceProvider>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </DeviceProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
