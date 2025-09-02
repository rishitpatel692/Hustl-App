import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Temporarily disabled for Expo Go
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext';

// Global error handler for Expo Go stability
// @ts-ignore
global.ErrorUtils?.setGlobalHandler((e: any, isFatal?: boolean) => console.log('GlobalError:', e, { isFatal }));
export default function RootLayout() {
  useFrameworkReady();

  return (
    <SupabaseProvider>
      <AuthProvider>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </View>
      </AuthProvider>
    </SupabaseProvider>
  );
}