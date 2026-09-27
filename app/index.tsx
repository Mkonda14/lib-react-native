import { Container, Spinner } from "@/components/ui";
import { router } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    router.replace("/(protected)/(tabs)" as any);
  }, []);

  return (
    <Container className="flex-1 items-center justify-center">
      <Spinner size="lg" />
    </Container>
  );
}

