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
import { useTwoFactor } from "@/lib/better-auth-rn/packages/auth-rn/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { z } from "zod";

const schema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

type Schema = z.infer<typeof schema>;

export default function TwoFactorScreen() {
  const { verifyTwoFactor, error, clearError } = useTwoFactor();
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (data: Schema) => {
    clearError();
    setLocalError(null);
    const result = await verifyTwoFactor(data.code);

    if (result.success) {
      router.replace("/(protected)/(tabs)" as any);
    } else {
      setLocalError(result.error ?? "Code invalide");
    }
  };

  const displayError = localError ?? error;

  return (
    <Container className="flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Double authentification</CardTitle>
          <CardDescription>
            Entrez le code à 6 chiffres de votre application d'authentification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayError && (
            <Text variant="body" className="mb-4 text-center text-destructive">
              {displayError}
            </Text>
          )}

          <Form
            resolver={zodResolver(schema)}
            defaultValues={{ code: "" }}
            mode="onBlur"
            onSubmit={onSubmit}
            keyboardAware
          >
            <FormField
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Code 2FA</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="000000"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormSubmit label="Vérifier le code" showLoading />
          </Form>
        </CardContent>
      </Card>
    </Container>
  );
}
