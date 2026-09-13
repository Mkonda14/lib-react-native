import { Container, Spinner } from "@/components/ui";
import { useSession } from "@/lib/better-auth-rn/packages/auth-rn/src";
import { router } from "expo-router";
import { useEffect } from "react";

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
    <Container className="flex-1 items-center justify-center">
      <Spinner size="lg" />
    </Container>
  );
}
