import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext';
import AuthGate from '@/components/AuthGate';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SupabaseProvider>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="chat" />
              <Stack.Screen name="task" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthGate>
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      </AuthProvider>
    </SupabaseProvider>
  );
}