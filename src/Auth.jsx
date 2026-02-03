import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('Check your email for confirmation!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (error) throw error
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
      
      <form onSubmit={handleAuth}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        >
          {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
        </button>
      </form>

      <button 
        onClick={handleGoogleSignIn}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#4285F4', color: 'white' }}
      >
        Sign in with Google
      </button>

      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        {mode === 'signin' ? (
          <p>
            Don't have an account?{' '}
            <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
              Sign Up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  )
}