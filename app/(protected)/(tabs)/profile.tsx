import {
  Container,
  Text,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ui";
import {
  useSession,
  useAuthActions,
} from "@/lib/better-auth-rn/packages/auth-rn/src";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user } = useSession();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in" as any);
  };

  return (
    <Container className="flex-1 p-6">
      <Text variant="heading" className="mb-6">
        Mon Profil
      </Text>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <Text variant="body">
            <Text variant="muted">Nom : </Text>
            {user?.name ?? "Non défini"}
          </Text>
          <Separator />
          <Text variant="body">
            <Text variant="muted">Email : </Text>
            {user?.email ?? "Non défini"}
          </Text>
          <Separator />
          <Text variant="body">
            <Text variant="muted">Email vérifié : </Text>
            {user?.emailVerified ? "Oui" : "Non"}
          </Text>
          <Separator />
          <Text variant="body">
            <Text variant="muted">2FA activé : </Text>
            {user?.twoFactorEnabled ? "Oui" : "Non"}
          </Text>
        </CardContent>
      </Card>

      <Button variant="destructive" className="mt-6" onPress={handleSignOut}>
        Se déconnecter
      </Button>
    </Container>
  );
}
