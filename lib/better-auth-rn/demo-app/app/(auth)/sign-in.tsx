/**
 * Sign In screen
 * ==============
 */

import * as React from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Link, router } from 'expo-router'
import { useSession, useAuthActions, signInWithGoogle, signInWithApple } from '@your-org/auth-rn'

export default function SignInScreen() {
  const { error, clearError } = useSession()
  const { signInEmail } = useAuthActions()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState<'google' | 'apple' | null>(null)

  React.useEffect(() => {
    return () => clearError()
  }, [clearError])

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    const result = await signInEmail(email, password)
    setLoading(false)

    if (result.success) {
      router.replace('/profile')
    } else if (result.requiresTwoFactor) {
      router.replace('/two-factor-verify')
    } else if (result.requiresEmailVerification) {
      router.replace('/verify-email')
    } else if (result.error) {
      Alert.alert('Erreur', result.error)
    }
  }

  const handleGoogle = async () => {
    setOauthLoading('google')
    const result = await signInWithGoogle()
    setOauthLoading(null)
    if (result.success) {
      router.replace('/profile')
    } else if (result.error) {
      Alert.alert('Erreur Google', result.error)
    }
  }

  const handleApple = async () => {
    setOauthLoading('apple')
    const result = await signInWithApple()
    setOauthLoading(null)
    if (result.success) {
      router.replace('/profile')
    } else if (result.error) {
      Alert.alert('Erreur Apple', result.error)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            style={[styles.button, styles.primaryButton, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Text>
          </Pressable>

          <Link href="/forgot-password" style={styles.link}>
            Mot de passe oublié ?
          </Link>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.button, styles.oauthButton, oauthLoading === 'google' && styles.disabled]}
          onPress={handleGoogle}
          disabled={oauthLoading !== null}
        >
          <Text style={styles.oauthText}>
            {oauthLoading === 'google' ? 'Connexion…' : 'Continuer avec Google'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.oauthButton, oauthLoading === 'apple' && styles.disabled]}
          onPress={handleApple}
          disabled={oauthLoading !== null}
        >
          <Text style={styles.oauthText}>
            {oauthLoading === 'apple' ? 'Connexion…' : 'Continuer avec Apple'}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Link href="/sign-up" style={styles.link}>
            S'inscrire
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  oauthButton: {
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  oauthText: {
    fontSize: 16,
    fontWeight: '500',
  },
  link: {
    color: '#6366F1',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4E4E7',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#71717A',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#71717A',
    fontSize: 14,
  },
})