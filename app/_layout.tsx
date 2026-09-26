import React, { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationBar, setVisibilityAsync } from 'expo-navigation-bar';
import { StatusBar as ExpoStatusBar, setStatusBarHidden } from 'expo-status-bar';
import '../src/i18n'; // Initialize i18n
import { LocationProvider } from '../src/context/LocationContext';
import { useReady } from '../src/api/hooks';
import { LanguageProvider } from '../src/context/LanguageContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ViewModeProvider } from '../src/context/ViewModeContext';
import { TabVisibilityProvider } from '../src/context/TabVisibilityContext';
import { AuthProvider } from '../src/context/AuthContext';
import { AuthModal } from '../src/components/AuthModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});

function ApiBoot() {
  useReady();
  return null;
}

function SystemNavAutoHider() {
  useEffect(() => {
    // Hide status bar / notification bar
    setStatusBarHidden(true, 'fade');
    RNStatusBar.setHidden(true, 'fade');

    if (Platform.OS === 'android') {
      try {
        NavigationBar.setHidden(true);
      } catch {
        setVisibilityAsync('hidden').catch(() => {});
      }
    }
  }, []);

  return (
    <>
      <ExpoStatusBar hidden={true} />
      {Platform.OS === 'android' ? <NavigationBar hidden={true} /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <LocationProvider>
              <ViewModeProvider>
                <TabVisibilityProvider>
                  <AuthProvider>
                    <ApiBoot />
                    <SystemNavAutoHider />
                    <Stack>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    </Stack>
                    <AuthModal />
                  </AuthProvider>
                </TabVisibilityProvider>
              </ViewModeProvider>
            </LocationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
