import { Stack } from "expo-router";
import { RequireAuth } from "@/lib/better-auth-rn/packages/auth-rn/src";

export default function ProtectedLayout() {
  return (
    <RequireAuth redirectTo="/(auth)/sign-in">
      <Stack screenOptions={{ headerShown: false }} />
    </RequireAuth>
  );
}
