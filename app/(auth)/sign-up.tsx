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

const schema = z
  .object({
    name: z.string().min(2, "Au moins 2 caractères"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Au moins 6 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type Schema = z.infer<typeof schema>;

export default function SignUpScreen() {
  const { signUpEmail } = useAuthActions();
  const { error, clearError } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast.destructive(error);
    }
  }, [error]);

  const onSubmit = async (data: Schema) => {
    clearError();
    const result = await signUpEmail({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (result.success) {
      if (result.requiresEmailVerification) {
        router.push("/(auth)/verify-email" as any);
      } else {
        router.replace("/(protected)/(tabs)" as any);
      }
    }
  };

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>S'inscrire</CardTitle>
          <CardDescription>Créez votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            resolver={zodResolver(schema)}
            defaultValues={{
              name: "",
              email: "",
              password: "",
              confirmPassword: "",
            }}
            mode="onBlur"
            onSubmit={onSubmit}
            keyboardAware
          >
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nom</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="words"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Confirmer le mot de passe</FormLabel>
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

            <FormSubmit label="S'inscrire" showLoading />
          </Form>
        </CardContent>
      </Card>

      <Link href={"/(auth)/sign-in" as any} asChild>
        <Text variant="link" className="mt-6 text-center">
          Déjà un compte ? Se connecter
        </Text>
      </Link>
    </Container>
  );
}
