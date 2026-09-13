import { useSession } from "@your-org/auth-rn";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(protected)/(tabs)" as any);
    } else if (status === "unauthenticated") {
      router.replace("/(auth)/sign-in" as any);
    }
  }, [status]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}
