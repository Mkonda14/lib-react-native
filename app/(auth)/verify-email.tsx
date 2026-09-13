import { useState } from "react";
import { Container, Text, Button } from "@/components/ui";
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
  token: z.string().min(1, "Le code est requis"),
});

type Schema = z.infer<typeof schema>;

export default function VerifyEmailScreen() {
  const { verifyEmail, sendEmailVerification } = useAuthActions();
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data: Schema) => {
    const result = await verifyEmail(data.token);

    if (result.success) {
      setVerified(true);
    } else {
      toast.destructive(result.error ?? "Code invalide ou expiré");
    }
  };

  const handleResend = async () => {
    const result = await sendEmailVerification();
    if (result.success) {
      setResent(true);
    }
  };

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Vérifier votre email</CardTitle>
          <CardDescription>
            Entrez le code de vérification envoyé à votre email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verified ? (
            <>
              <Text variant="body" className="text-center">
                Votre email a été vérifié avec succès.
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
                defaultValues={{ token: "" }}
                mode="onBlur"
                onSubmit={onSubmit}
                keyboardAware
              >
                <FormField
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Code de vérification</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Entrez le code"
                          autoCapitalize="none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormSubmit label="Vérifier" showLoading />
              </Form>

              <Button
                variant="ghost"
                className="mt-4"
                onPress={handleResend}
              >
                {resent ? "Code renvoyé !" : "Renvoyer le code"}
              </Button>
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
