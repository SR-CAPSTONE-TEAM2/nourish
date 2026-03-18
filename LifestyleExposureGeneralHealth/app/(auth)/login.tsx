import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import {useRouter} from 'expo-router'

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: '24px',
  },
  card: {
    backgroundColor: '#242424',
    borderRadius: '28px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    border: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    textAlign: 'center',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#f0f0f0',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    backgroundColor: '#2e2e2e',
    border: '1.5px solid #3a3a3a',
    borderRadius: '14px',
    padding: '14px 18px',
    fontSize: '15px',
    color: '#f0f0f0',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  primaryButton: {
    backgroundColor: '#f0f0f0',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 18px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    width: '100%',
    letterSpacing: '0.1px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#555',
    fontSize: '13px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#333',
  },
  googleButton: {
    backgroundColor: '#2e2e2e',
    color: '#f0f0f0',
    border: '1.5px solid #3a3a3a',
    borderRadius: '14px',
    padding: '14px 18px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s, transform 0.1s',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  message: {
    backgroundColor: '#2e2e2e',
    border: '1.5px solid #3a3a3a',
    borderRadius: '14px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#aaa',
    textAlign: 'center',
  },
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [primaryHover, setPrimaryHover] = useState(false)
  const [googleHover, setGoogleHover] = useState(false)
  const [inputFocus, setInputFocus] = useState(false)
  const [devHover, setDevHover] = useState(false)
  const router = useRouter()
  console.log(window.location.origin)

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard'

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/(auth)/callback`,
      },
    })
  }

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/(auth)/callback`,
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
      email: 'seed_augustus.gleason@hotmail.com',  // whatever email is in your DB
      password: '1234'
    })
    if (error) console.error(error)
    else router.replace('/dashboard')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Welcome back</h2>
          <p style={styles.subtitle}>Sign in to continue</p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={signInWithGoogle}
          style={{
            ...styles.googleButton,
            backgroundColor: googleHover ? '#383838' : '#2e2e2e',
            borderColor: googleHover ? '#555' : '#3a3a3a',
            transform: googleHover ? 'translateY(-1px)' : 'none',
          }}
          onMouseEnter={() => setGoogleHover(true)}
          onMouseLeave={() => setGoogleHover(false)}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span>or</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Email Magic Link */}
        <form onSubmit={signInWithEmail} style={styles.form}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              ...styles.input,
              borderColor: inputFocus ? '#666' : '#3a3a3a',
            }}
            onFocus={() => setInputFocus(true)}
            onBlur={() => setInputFocus(false)}
          />
          <button
            type="submit"
            style={{
              ...styles.primaryButton,
              backgroundColor: primaryHover ? '#d8d8d8' : '#f0f0f0',
              transform: primaryHover ? 'translateY(-1px)' : 'none',
            }}
            onMouseEnter={() => setPrimaryHover(true)}
            onMouseLeave={() => setPrimaryHover(false)}
          >
            Send Magic Link
          </button>
        </form>
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={signInAsDummyUser}
            style={{
              ...styles.googleButton,
              backgroundColor: devHover ? '#383838' : '#2e2e2e',
              borderColor: devHover ? '#555' : '#3a3a3a',
              transform: devHover ? 'translateY(-1px)' : 'none',
            }}
            onMouseEnter={() => setDevHover(true)}
            onMouseLeave={() => setDevHover(false)}
          >
            Dev Login (Simeon)
          </button>
        )}

        {/* Message */}
        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
    
    
  )
}