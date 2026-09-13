# Guide d'intégration — App Expo Router

Ce document est le **guide complet** pour intégrer `@your-org/auth-rn` dans une app Expo Router.
Il couvre l'installation, la configuration, l'intégration pas à pas, et le dépannage.

---

## 1. Pré-requis

| Composant | Version minimale | Description |
|-----------|-----------------|-------------|
| Expo SDK | 57+ | Framework React Native |
| React Native | 0.86+ | Runtime mobile |
| react-native-mmkv | `^3.3.3` | Stockage chiffré (pas v4 — nécessite NitroModules) |
| expo-secure-store | 57+ | Keychain OS (refresh token) |
| expo-web-browser | 57+ | Flow OAuth in-app |
| expo-linking | 57+ | Deep links |
| expo-local-authentication | 57+ | Face ID / Touch ID |

> **IMPORTANT** : Utilisez `react-native-mmkv` v3, pas v4. La v4 nécessite `react-native-nitro-modules` qui n'est pas compatible avec Expo Go.

---

## 2. Installation

### 2.1 Installer le package

```bash
npm install @your-org/auth-rn
```

### 2.2 Dépendances peer

Le package nécessite les dépendances suivantes (normalement déjà présentes dans un projet Expo) :

```bash
npm install react-native-mmkv@^3.3.3 expo-secure-store expo-web-browser expo-linking expo-local-authentication
```

### 2.3 Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# URL du backend Better Auth
# - Simulateur iOS : http://127.0.0.1:3000
# - Émulateur Android : http://10.0.2.2:3000
# - Appareil physique : http://<IP_Locale>:3000
EXPO_PUBLIC_BACKEND_URL="http://192.168.x.x:3000"

# Clé de chiffrement MMKV (32+ caractères)
# Générer avec : openssl rand -hex 32
EXPO_PUBLIC_MMKV_KEY="votre-cle-de-chiffrement-32-chars"
```

**Règle pour l'URL backend** :

| Environnement | URL correcte |
|---------------|-------------|
| Simulateur iOS | `http://127.0.0.1:3000` |
| Émulateur Android | `http://10.0.2.2:3000` |
| Appareil physique | `http://<IP_Locale>:3000` |
| Expo Go (physique) | `http://<IP_Locale>:3000` |

Pour trouver l'IP locale de votre machine :
```bash
# Linux/Mac
hostname -I | awk '{print $1}'

# Windows
ipconfig
```

---

## 3. Configuration

### 3.1 `app/_layout.tsx` — Racine

```tsx
import "./global.css"

import { Tabs } from "expo-router"
import { SafeAreaProvider } from "react-native-safe-area-context"
import {
  AuthProvider,
  defineAuthConfig,
  registerNavigator,
} from "@your-org/auth-rn"
import { router } from "expo-router"

// 1. Définir la config (validée par Zod au runtime)
const authConfig = defineAuthConfig({
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:3000",
  appId: "mon-app",
  appName: "Mon App",
  deepLink: { scheme: "myapp1" },
  storage: {
    mmkvEncryptionKey:
      process.env.EXPO_PUBLIC_MMKV_KEY ??
      "dev-key-change-me-must-be-at-least-32-characters",
  },
})

// 2. Enregistrer le navigator pour les redirects (une seule fois)
registerNavigator((path) => router.replace(path as any))

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider config={authConfig}>
        <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" options={{ title: "Accueil" }} />
          <Tabs.Screen name="profile" options={{ title: "Profil" }} />
        </Tabs>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
```

### 3.2 Validation de config

`defineAuthConfig` valide la config au runtime via Zod. Erreurs courantes :

| Erreur | Cause | Solution |
|--------|-------|----------|
| `mmkvEncryptionKey must be at least 32 characters` | Clé trop courte | Générer avec `openssl rand -hex 32` |
| `appId must be lowercase kebab-case` | Majuscules ou underscores | Utiliser `mon-app` pas `monApp` |
| `scheme must match /^[a-z][a-z0-9-]*$/` | Caractères spéciaux | Utiliser `myapp1` pas `my_app1` |

---

## 4. Structure de fichiers

```
app/
├── _layout.tsx                    ← Racine (AuthProvider + config + Tabs)
├── index.tsx                      ← Écran d'accueil
├── (auth)/
│   ├── _layout.tsx                ← RedirectIfAuth
│   ├── sign-in.tsx                ← Écran de connexion
│   ├── sign-up.tsx                ← Inscription
│   ├── forgot-password.tsx        ← Mot de passe oublié
│   ├── verify-email.tsx           ← Vérification email
│   ├── two-factor-setup.tsx       ← Configuration 2FA
│   └── two-factor-verify.tsx      ← Vérification 2FA
├── (protected)/
│   ├── _layout.tsx                ← RequireAuth
│   └── profile.tsx                ← Profil utilisateur
```

---

## 5. Écrans d'authentification

### 5.1 `app/(auth)/_layout.tsx` — Layout auth

```tsx
import { Stack } from "expo-router"
import { RedirectIfAuth } from "@your-org/auth-rn"

export default function AuthLayout() {
  return (
    <RedirectIfAuth redirectTo="/profile">
      <Stack screenOptions={{ headerShown: false }} />
    </RedirectIfAuth>
  )
}
```

**Comportement** : Redirige vers `/profile` si déjà connecté.

### 5.2 `app/(auth)/sign-in.tsx` — Connexion

```tsx
import * as React from "react"
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native"
import { Link, router } from "expo-router"
import { useSession, useAuthActions } from "@your-org/auth-rn"

export default function SignInScreen() {
  const { error, clearError } = useSession()
  const { signInEmail } = useAuthActions()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    return () => clearError()
  }, [clearError])

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    const result = await signInEmail(email, password)
    setLoading(false)

    if (result.success) {
      router.replace("/profile")
    } else if (result.requiresTwoFactor) {
      router.replace("/two-factor-verify")
    } else if (result.requiresEmailVerification) {
      router.replace("/verify-email")
    } else if (result.error) {
      Alert.alert("Erreur", result.error)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Connexion</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={[styles.button, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Connexion…" : "Se connecter"}
            </Text>
          </Pressable>
          <Link href="/forgot-password" style={styles.link}>
            Mot de passe oublié ?
          </Link>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Link href="/sign-up" style={styles.link}>S'inscrire</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#6366F1" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { color: "#6366F1", fontSize: 14, textAlign: "center", marginTop: 4 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  footerText: { color: "#71717A", fontSize: 14 },
})
```

### 5.3 `app/(auth)/sign-up.tsx` — Inscription

```tsx
import * as React from "react"
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native"
import { Link, router } from "expo-router"
import { useAuthActions } from "@your-org/auth-rn"

export default function SignUpScreen() {
  const { signUpEmail } = useAuthActions()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return
    if (password.length < 8) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 8 caractères")
      return
    }
    setLoading(true)
    const result = await signUpEmail({ email, password, name: name || undefined })
    setLoading(false)

    if (result.success && result.requiresEmailVerification) {
      Alert.alert("Vérifiez votre email", "Un lien de confirmation a été envoyé à " + email)
      router.replace("/verify-email")
    } else if (result.success) {
      router.replace("/profile")
    } else if (result.error) {
      Alert.alert("Erreur", result.error)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Créer un compte</Text>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nom (optionnel)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Mot de passe (8+ caractères)" secureTextEntry value={password} onChangeText={setPassword} />
          <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Création…" : "Créer le compte"}</Text>
          </Pressable>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <Link href="/sign-in" style={styles.link}>Se connecter</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#6366F1" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { color: "#6366F1", fontSize: 14 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  footerText: { color: "#71717A", fontSize: 14 },
})
```

### 5.4 `app/(auth)/forgot-password.tsx` — Mot de passe oublié

```tsx
import * as React from "react"
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Link } from "expo-router"
import { useAuthActions } from "@your-org/auth-rn"

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuthActions()
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    const result = await requestPasswordReset(email)
    setLoading(false)
    if (result.success) {
      setSent(true)
    } else {
      Alert.alert("Erreur", result.error ?? "Échec de la demande")
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Email envoyé</Text>
        <Text style={styles.text}>Si un compte existe pour {email}, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.</Text>
        <Link href="/sign-in" style={styles.link}>Retour à la connexion</Link>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>Entrez votre email. Vous recevrez un lien pour réinitialiser votre mot de passe.</Text>
        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Envoi…" : "Envoyer le lien"}</Text>
        </Pressable>
        <Link href="/sign-in" style={styles.link}>Retour à la connexion</Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#71717A", textAlign: "center", marginBottom: 16 },
  text: { fontSize: 16, color: "#71717A", textAlign: "center", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#6366F1" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { color: "#6366F1", fontSize: 14, textAlign: "center" },
})
```

### 5.5 `app/(auth)/verify-email.tsx` — Vérification email

```tsx
import * as React from "react"
import { View, Text, Pressable, StyleSheet, Alert } from "react-native"
import { Link } from "expo-router"
import { useAuthActions, useSession } from "@your-org/auth-rn"

export default function VerifyEmailScreen() {
  const { user, refresh } = useSession()
  const { sendEmailVerification } = useAuthActions()
  const [loading, setLoading] = React.useState(false)

  const handleResend = async () => {
    setLoading(true)
    const result = await sendEmailVerification()
    setLoading(false)
    if (result.success) {
      Alert.alert("Email envoyé", "Vérifiez votre boîte de réception.")
    } else {
      Alert.alert("Erreur", result.error ?? "Échec de l'envoi")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vérifiez votre email</Text>
      <Text style={styles.text}>
        Nous avons envoyé un lien de confirmation à <Text style={styles.email}>{user?.email}</Text>.
      </Text>
      <Text style={styles.hint}>Cliquez sur le lien dans l'email pour activer votre compte.</Text>
      <Pressable style={styles.button} onPress={() => refresh()}>
        <Text style={styles.buttonText}>J'ai vérifié, continuer</Text>
      </Pressable>
      <Pressable style={[styles.linkButton, loading && styles.disabled]} onPress={handleResend} disabled={loading}>
        <Text style={styles.link}>{loading ? "Envoi…" : "Renvoyer l'email"}</Text>
      </Pressable>
      <Link href="/sign-in" style={styles.link}>Retour à la connexion</Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  text: { fontSize: 16, color: "#71717A", textAlign: "center" },
  email: { fontWeight: "600", color: "#18181B" },
  hint: { fontSize: 14, color: "#A1A1AA", textAlign: "center" },
  button: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#6366F1" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  linkButton: { alignItems: "center", paddingVertical: 8 },
  disabled: { opacity: 0.5 },
  link: { color: "#6366F1", fontSize: 14, textAlign: "center" },
})
```

### 5.6 `app/(auth)/two-factor-setup.tsx` — Configuration 2FA

```tsx
import * as React from "react"
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image, ScrollView, Platform } from "react-native"
import { Link, router } from "expo-router"
import { useTwoFactor, getQRCodeUrl } from "@your-org/auth-rn"

export default function TwoFactorSetupScreen() {
  const { generateTOTP, enableTOTP, totpSecret, backupCodes, loading } = useTwoFactor()
  const [code, setCode] = React.useState("")
  const [step, setStep] = React.useState<"intro" | "qr" | "codes">("intro")

  React.useEffect(() => {
    generateTOTP().then((s) => { if (s) setStep("qr") })
  }, [generateTOTP])

  const handleVerify = async () => {
    if (code.length !== 6) return
    const result = await enableTOTP(code)
    if (result.success) {
      setStep("codes")
    } else {
      Alert.alert("Erreur", result.error ?? "Code invalide")
    }
  }

  if (step === "intro") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Authentification à 2 facteurs</Text>
        <Text style={styles.text}>Sécurisez votre compte avec une couche supplémentaire.</Text>
        <Pressable style={styles.button} onPress={async () => { const s = await generateTOTP(); if (s) setStep("qr") }}>
          <Text style={styles.buttonText}>Commencer</Text>
        </Pressable>
        <Link href="/profile" style={styles.link}>Plus tard</Link>
      </View>
    )
  }

  if (step === "qr") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Scannez le QR code</Text>
        <Text style={styles.text}>Ouvrez Google Authenticator ou Authy et scannez ce code :</Text>
        {totpSecret && (
          <View style={styles.qrContainer}>
            <Image source={{ uri: getQRCodeUrl(totpSecret.uri) }} style={styles.qr} resizeMode="contain" />
          </View>
        )}
        <Text style={styles.orText}>Ou saisissez manuellement :</Text>
        <View style={styles.secretBox}>
          <Text style={styles.secret}>{totpSecret?.secret}</Text>
        </View>
        <Text style={styles.label}>Code à 6 chiffres</Text>
        <TextInput style={styles.codeInput} placeholder="000000" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
        <Pressable style={[styles.button, (loading || code.length !== 6) && styles.disabled]} onPress={handleVerify} disabled={loading || code.length !== 6}>
          <Text style={styles.buttonText}>{loading ? "Vérification…" : "Vérifier et activer"}</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>2FA activé</Text>
      <Text style={styles.text}>Conservez ces codes de secours en lieu sûr. Chacun peut être utilisé une seule fois.</Text>
      <View style={styles.codesContainer}>
        {backupCodes?.map((c, i) => (
          <Text key={i} style={styles.backupCode}>{c}</Text>
        ))}
      </View>
      <Pressable style={styles.button} onPress={() => router.replace("/profile")}>
        <Text style={styles.buttonText}>J'ai sauvegardé les codes</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  text: { fontSize: 16, color: "#71717A", textAlign: "center" },
  qrContainer: { alignItems: "center", marginVertical: 16 },
  qr: { width: 240, height: 240 },
  orText: { textAlign: "center", color: "#A1A1AA", fontSize: 14 },
  secretBox: { backgroundColor: "#F4F4F5", padding: 12, borderRadius: 8, alignItems: "center" },
  secret: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 14, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "500", marginTop: 8 },
  codeInput: { borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, textAlign: "center", letterSpacing: 8, fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
  button: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#6366F1" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { color: "#6366F1", fontSize: 14, textAlign: "center" },
  codesContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginVertical: 16 },
  backupCode: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 16, fontWeight: "600", backgroundColor: "#F4F4F5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
})
```

### 5.7 `app/(auth)/two-factor-verify.tsx` — Vérification 2FA

```tsx
import * as React from "react"
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { router } from "expo-router"
import { useTwoFactor } from "@your-org/auth-rn"

export default function TwoFactorVerifyScreen() {
  const { verifyTwoFactor, verifyBackupCode, loading } = useTwoFactor()
  const [code, setCode] = React.useState("")
  const [mode, setMode] = React.useState<"totp" | "backup">("totp")

  const handleSubmit = async () => {
    if (code.length < 6) return
    const fn = mode === "totp" ? verifyTwoFactor : verifyBackupCode
    const result = await fn(code)
    if (result.success) {
      router.replace("/profile")
    } else {
      Alert.alert("Erreur", result.error ?? "Code invalide")
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{mode === "totp" ? "Code TOTP" : "Code de secours"}</Text>
        <Text style={styles.text}>
          {mode === "totp" ? "Saisissez le code à 6 chiffres de votre application d'authentification." : "Saisissez l'un de vos codes de secours."}
        </Text>
        <TextInput style={styles.codeInput} placeholder={mode === "totp" ? "000000" : "XXXXXXXX"} keyboardType={mode === "totp" ? "number-pad" : "default"} autoCapitalize="none" maxLength={mode === "totp" ? 6 : 8} value={code} onChangeText={setCode} />
        <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSubmit} disabled={loading || code.length < 6}>
          <Text style={styles.buttonText}>{loading ? "Vérification…" : "Vérifier"}</Text>
        </Pressable>
        <Pressable onPress={() => { setMode(mode === "totp" ? "backup" : "totp"); setCode("") }}>
          <Text style={styles.link}>{mode === "totp" ? "Utiliser un code de secours" : "Utiliser le code TOTP"}</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/sign-in")}>
          <Text style={styles.link}>Retour à la connexion</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  text: { fontSize: 14, color: "#71717A", textAlign: "center" },
  codeInput: { borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, textAlign: "center", letterSpacing: 8, fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
  button: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#6366F1" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { color: "#6366F1", fontSize: 14, textAlign: "center" },
})
```

---

## 6. Écrans protégés

### 6.1 `app/(protected)/_layout.tsx` — Layout protégé

```tsx
import { Stack } from "expo-router"
import { RequireAuth } from "@your-org/auth-rn"

export default function ProtectedLayout() {
  return (
    <RequireAuth redirectTo="/sign-in">
      <Stack screenOptions={{ headerShown: false }} />
    </RequireAuth>
  )
}
```

**Comportement** : Redirige vers `/sign-in` si non connecté.

### 6.2 `app/(protected)/profile.tsx` — Profil

```tsx
import * as React from "react"
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native"
import { router } from "expo-router"
import { useSession } from "@your-org/auth-rn"

export default function ProfileScreen() {
  const { user, session, signOut } = useSession()

  const handleSignOut = async () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          await signOut()
          router.replace("/sign-in")
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.name}>{user?.name ?? "Anonyme"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          <Text style={styles.debugText}>
            Token: {session?.session.token.slice(0, 8)}…
          </Text>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Déconnexion</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 24, gap: 24 },
  header: { alignItems: "center", gap: 8, marginTop: 24 },
  name: { fontSize: 24, fontWeight: "700" },
  email: { fontSize: 14, color: "#71717A" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#71717A", textTransform: "uppercase", marginBottom: 4 },
  debugText: { fontFamily: "monospace", fontSize: 12, color: "#A1A1AA" },
  signOutButton: { alignItems: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: "#FEE2E2", marginTop: 16 },
  signOutText: { color: "#DC2626", fontSize: 16, fontWeight: "600" },
})
```

---

## 7. Hooks disponibles

| Hook | Import | Retour | Usage |
|------|--------|--------|-------|
| `useSession()` | `@your-org/auth-rn` | `{ session, user, status, isLoading, error, clearError, signInEmail, signUpEmail, signOut, refresh }` | État de session + actions |
| `useAuthActions()` | `@your-org/auth-rn` | `{ signInEmail, signUpEmail, signOut, requestPasswordReset, resetPassword, sendEmailVerification, verifyEmail, changePassword }` | Actions d'authentification |
| `useTwoFactor()` | `@your-org/auth-rn` | `{ generateTOTP, enableTOTP, verifyTwoFactor, verifyBackupCode, disableTOTP, totpSecret, backupCodes, loading }` | Gestion 2FA TOTP |
| `useBiometric()` | `@your-org/auth-rn` | `{ status, enabled, enable, disable, authenticate }` | Face ID / Touch ID |

---

## 8. Composants middleware

| Composant | Props | Comportement |
|-----------|-------|--------------|
| `AuthProvider` | `{ children, config }` | Fournit le contexte de session à toute l'app |
| `RequireAuth` | `{ children, redirectTo, loadingFallback? }` | Protège une route, redirige si non auth |
| `RedirectIfAuth` | `{ children, redirectTo? }` | Redirige si déjà auth (écrans login) |
| `RequireRole` | `{ children, roles, redirectTo?, fallbackRoute?, loadingFallback? }` | Protège une route par rôle |

---

## 9. Arbre de navigation

```
Root (_layout.tsx)
├── AuthProvider
├── (auth)/
│   ├── _layout.tsx          → RedirectIfAuth
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── forgot-password.tsx
│   ├── verify-email.tsx
│   ├── two-factor-setup.tsx
│   └── two-factor-verify.tsx
└── (protected)/
    ├── _layout.tsx          → RequireAuth
    └── profile.tsx
```

**Flux utilisateur** :
1. Non connecté → `(auth)/sign-in`
2. Connexion → `(protected)/profile`
3. 2FA requis → `(auth)/two-factor-verify` → `(protected)/profile`
4. Email non vérifié → `(auth)/verify-email` → `(protected)/profile`
5. Déconnexion → `(auth)/sign-in`

---

## 10. Dépannage

### 10.1 Erreurs de connexion

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Impossible de joindre le serveur` | URL backend incorrecte | Vérifier `EXPO_PUBLIC_BACKEND_URL` dans `.env` |
| `Failed to get NitroModules` | react-native-mmkv v4 installé | Rétrograder : `npm install react-native-mmkv@^3.3.3` |
| `Invalid origin: xxx://` | Schéma manquant dans `trustedOrigins` | Ajouter le schéma côté backend |

### 10.2 Erreurs de build

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Unable to resolve module` | Cache Metro | `npx expo start --clear` |
| `Cannot find module '@your-org/auth-rn'` | Package non linké | Vérifier le `tsconfig.json` paths |

### 10.3 Testing sur appareil physique

1. **Vérifier que le backend tourne** : `curl http://<IP>:3000/api/auth/get-session`
2. **Mettre à jour `.env`** avec l'IP correcte
3. **Relancer Expo** : `npx expo start --clear`
4. **Scanner le QR code** avec Expo Go

### 10.4 Variables d'environnement

Les variables `EXPO_PUBLIC_*` sont injectées au build. Si vous changez `.env` :
- **Expo Go** : `npx expo start --clear`
- **Dev build** : `npx expo prebuild --clean && npx expo run:android/ios`
