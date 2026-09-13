import { Stack } from "expo-router";
import { RedirectIfAuth } from "@your-org/auth-rn";

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
