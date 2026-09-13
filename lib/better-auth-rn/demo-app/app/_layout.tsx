/**
 * Root layout — wraps the app in <AuthProvider>
 * =================================================
 *
 * Also registers the navigator so <RequireAuth> can trigger redirects.
 */

import * as React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  AuthProvider,
  registerNavigator,
  defineAuthConfig,
} from '@your-org/auth-rn'
import { router } from 'expo-router'
import { Platform } from 'react-native'

const rawBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://127.0.0.1:3000");

// TODO: Replace with your actual backend URL
const authConfig = defineAuthConfig({
  backendUrl: rawBackendUrl,
  appId: 'demo-app',
  appName: 'Demo Auth RN',
  deepLink: { scheme: 'myapp1' },
  storage: { mmkvEncryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY ?? 'dev-key-change-me-must-be-at-least-32-characters' },
})

// Register the navigator once
registerNavigator((path) => router.replace(path as any))

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider config={authConfig}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(protected)" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}