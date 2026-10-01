import { Container, Text } from "@/components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmit,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import {
  useAuthActions,
  useSession,
} from "@/lib/better-auth-rn/packages/auth-rn/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useEffect } from "react";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
});

type Schema = z.infer<typeof schema>;

export default function SignInScreen() {
  const { signInEmail } = useAuthActions();
  const { error, clearError } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast.destructive(error);
    }
  }, [error]);

  const onSubmit = async (data: Schema) => {
    clearError();
    const result = await signInEmail(data.email, data.password);

    if (result.success) {
      router.replace("/(protected)/(tabs)" as any);
    } else if (result.requiresTwoFactor) {
      router.push("/(auth)/two-factor" as any);
    } else if (result.requiresEmailVerification) {
      router.push("/(auth)/verify-email" as any);
    }
  };

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>Connectez-vous à votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            resolver={zodResolver(schema)}
            defaultValues={{ email: "", password: "" }}
            mode="onBlur"
            onSubmit={onSubmit}
            keyboardAware
          >
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="vous@exemple.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Mot de passe</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      secureTextEntry
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormSubmit label="Se connecter" showLoading />
          </Form>

          <Link href={"/(auth)/forgot-password" as any} asChild>
            <Text variant="link" className="mt-4 text-center">
              Mot de passe oublié ?
            </Text>
          </Link>
        </CardContent>
      </Card>

      <Link href={"/(auth)/sign-up" as any} asChild>
        <Text variant="link" className="mt-6 text-center">
          Pas encore de compte ? S'inscrire
        </Text>
      </Link>
      <Link href={"/(protected)/(tabs)" as any} asChild>
        <Text variant="link" className="mt-6 text-center">
          Accéder à l'application (test)
        </Text>
      </Link>
    </Container>
  );
}
