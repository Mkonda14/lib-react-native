## API publique

```tsx
// Components
<Form />
<FormField />
<FormItem />
<FormLabel />
<FormControl />
<FormDescription />
<FormMessage />
<FormSubmit />

// Hooks
useFormContext<TFieldValues>()   // UseFormReturn complet
useFormField()                    // état du FormItem courant

// Re-exports
useForm, Controller               // from react-hook-form
types: UseFormProps, UseFormReturn, FieldValues, FieldPath, ControllerProps, Resolver, DefaultValues
```

## Usage

```tsx
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormSubmit } from '@/components/form'
import { Input } from './input'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Min 8 caractères'),
})
type Schema = z.infer<typeof schema>

export function LoginForm() {
  const onSubmit = async (data: Schema) => {
    await api.login(data.email, data.password)
  }

  return (
    <Form
      resolver={zodResolver(schema)}
      defaultValues={{ email: '', password: '' }}
      mode="onBlur"
      onSubmit={onSubmit}
      keyboardAware
    >
      <FormField<Schema, "email" | "password">
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

      <FormField<Schema, "email" | "password">
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
  )
}
```

## Notes d'implémentation

- **`useFieldError`** : souscrit à `form.formState.subscribe()` — écouté au niveau du `FormItem`, pas du `FormMessage`, donc un seul subscriber par champ (pas de re-render en cascade)
- **`FormSubmit`** récupère `handleSubmit` via une propriété cachée `form.__rnHandleSubmit` (attachée par `<Form>`) — évite de re-exposer un context séparé
- **`accessibilityLabelledBy`** + `accessibilityDescribedBy` lient le label et les messages au contrôle (VoiceOver lit automatiquement "Email, champ texte, Email invalide" quand le champ a une erreur)
- **`KeyboardAvoidingView`** n'est activé que sur iOS (sur Android, le `windowSoftInputMode` du manifeste gère ça)

## Pré-requis
- `react-hook-form` v7+
- `@hookform/resolvers` (si vous utilisez Zod / Yup / Valibot)
- `zod` (ou autre schema validator)
- `react-native-reanimated` v3+
- `class-variance-authority`
- `@/lib/utils` avec `cn()`