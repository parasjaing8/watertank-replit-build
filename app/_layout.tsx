import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import {
  NotoSansKannada_400Regular,
  NotoSansKannada_700Bold,
} from '@expo-google-fonts/noto-sans-kannada';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DeviceProvider } from '@/context/DeviceContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import * as NotificationService from '@/services/NotificationService';
import { init as initCrashReport } from '@/services/CrashReportService';

SplashScreen.preventAutoHideAsync();
// Init before anything else so the global error handler is in place
initCrashReport().catch(() => {});

async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 31) return;
  try {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
  } catch {}
}

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

/** Inner component so it can read ThemeContext after ThemeProvider is mounted. */
function ThemedApp({ fontsLoaded, fontError }: { fontsLoaded: boolean; fontError: Error | null }) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#0A1628' : '#F0F4FA';

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: bg }} />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={bg} translucent={false} />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
        <KeyboardProvider>
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Feather icon font — loaded explicitly so Font.isLoaded('feather') is true
    feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
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
    requestBlePermissions();
    NotificationService.requestPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <ThemeProvider>
            <DeviceProvider>
              <ThemedApp fontsLoaded={fontsLoaded} fontError={fontError} />
            </DeviceProvider>
          </ThemeProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
