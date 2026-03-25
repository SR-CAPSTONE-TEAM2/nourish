import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <Path
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      fill="#34A853"
    />
    <Path
      d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      fill="#FBBC05"
    />
    <Path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </Svg>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const router = useRouter()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `myapp:///(auth)/callback`,
      },
    })
  }

  const signInWithEmail = async () => {
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `myapp:///(auth)/callback`,
      },
    })
    if (error) {
      setMessage(`Error sending link: ${error.message}`)
      console.error(error)
      return
    }
    setMessage(`Check your email for a confirmation link: ${email}`)
    console.log('Confirmation email sent.')
  }

  const signInAsDummyUser = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'seed_augustus.gleason@hotmail.com',
      password: '1234',
    })
    if (error) console.error(error)
    else router.replace('/dashboard')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={signInWithGoogle}
              activeOpacity={0.75}
            >
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Magic Link */}
            <View style={styles.form}>
              <TextInput
                style={[styles.input, inputFocused && styles.inputFocused]}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={signInWithEmail}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Send Magic Link</Text>
              </TouchableOpacity>
            </View>

            {/* Dev Login */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.googleButton}
                onPress={signInAsDummyUser}
                activeOpacity={0.75}
              >
                <Text style={styles.googleButtonText}>Dev Login (Simeon)</Text>
              </TouchableOpacity>
            )}

            {/* Message */}
            {message ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  page: {
    flexGrow: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#242424',
    borderRadius: 28,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1.5,
    borderColor: '#3a3a3a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#f0f0f0',
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: '#666',
  },
  primaryButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#555',
    fontSize: 13,
  },
  googleButton: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1.5,
    borderColor: '#3a3a3a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '500',
  },
  messageBox: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1.5,
    borderColor: '#3a3a3a',
    borderRadius: 14,
    padding: 14,
  },
  messageText: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
  },
})