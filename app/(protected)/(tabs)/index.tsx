import { Container, Text } from "@/components/ui";
import { useSession } from "@/lib/better-auth-rn/packages/auth-rn/src";

export default function HomeScreen() {
  const { user } = useSession();

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Text variant="heading" className="mb-2">
        Bienvenue
      </Text>
      <Text variant="muted" className="text-center">
        {user?.name ?? user?.email ?? "Utilisateur"}
      </Text>
    </Container>
  );
}
