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
import { Link } from "expo-router";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

type Schema = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuthActions();
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data: Schema) => {
    const result = await requestPasswordReset(data.email);

    if (result.success) {
      setSent(true);
    } else {
      toast.destructive(result.error ?? "Une erreur est survenue");
    }
  };

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>
            Entrez votre email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Text variant="body" className="text-center">
              Un email de réinitialisation vous a été envoyé. Vérifiez votre
              boîte de réception.
            </Text>
          ) : (
            <>
              <Form
                resolver={zodResolver(schema)}
                defaultValues={{ email: "" }}
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

                <FormSubmit label="Envoyer le lien" showLoading />
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
