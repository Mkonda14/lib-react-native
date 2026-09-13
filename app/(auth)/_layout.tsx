import { Stack } from "expo-router";
import { RedirectIfAuth } from "@/lib/better-auth-rn/packages/auth-rn/src";

export default function AuthLayout() {
  return (
    <RedirectIfAuth redirectTo="/(protected)/(tabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
          animation: "fade",
        }}
      />
    </RedirectIfAuth>
  );
}
