import "./global.css";

import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import {
  AuthProvider,
  defineAuthConfig,
  registerNavigator,
} from "@/lib/better-auth-rn/packages/auth-rn/src";
import { ToastProvider } from "@/components/ui/toaster";

import { Platform } from "react-native";

const rawBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://127.0.0.1:3000");

const backendUrl =
  Platform.OS === "android" &&
  (rawBackendUrl.includes("127.0.0.1") || rawBackendUrl.includes("localhost"))
    ? rawBackendUrl.replace("127.0.0.1", "10.0.2.2").replace("localhost", "10.0.2.2")
    : rawBackendUrl;

const authConfig = defineAuthConfig({
  backendUrl,
  appId: "demo-app",
  appName: "Demo Auth RN",
  deepLink: { scheme: "mypharmacymobile" },
  storage: {
    mmkvEncryptionKey:
      process.env.EXPO_PUBLIC_MMKV_KEY ??
      "dev-key-change-me-must-be-at-least-32-characters",
  },
});

export default function RootLayout() {
  useEffect(() => {
    registerNavigator((path) => router.replace(path as any));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider config={authConfig}>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(protected)" />
            </Stack>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
