import { useState } from "react";
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
import { useAuthActions } from "@/lib/better-auth-rn/packages/auth-rn/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocalSearchParams } from "expo-router";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(6, "Au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Au moins 6 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type Schema = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { resetPassword } = useAuthActions();
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data: Schema) => {
    if (!token) {
      toast.destructive("Token de réinitialisation manquant");
      return;
    }

    const result = await resetPassword(token, data.password);

    if (result.success) {
      setSuccess(true);
    } else {
      toast.destructive(result.error ?? "Une erreur est survenue");
    }
  };

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <>
              <Text variant="body" className="text-center">
                Votre mot de passe a été réinitialisé avec succès.
              </Text>
              <Link href={"/(auth)/sign-in" as any} asChild>
                <Text variant="link" className="mt-4 text-center">
                  Se connecter
                </Text>
              </Link>
            </>
          ) : (
            <>
              <Form
                resolver={zodResolver(schema)}
                defaultValues={{ password: "", confirmPassword: "" }}
                mode="onBlur"
                onSubmit={onSubmit}
                keyboardAware
              >
                <FormField
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Nouveau mot de passe</FormLabel>
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

                <FormSubmit label="Réinitialiser" showLoading />
              </Form>
            </>
          )}
        </CardContent>
      </Card>

      <Link href={"/(auth)/sign-in" as any} asChild>
        <Text variant="link" className="mt-6 text-center">
          Retour à la connexion
        </Text>
      </Link>
    </Container>
  );
}
