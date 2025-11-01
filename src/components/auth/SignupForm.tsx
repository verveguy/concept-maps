/**
 * Signup form component.
 * Uses InstantDB Magic Code authentication.
 * 
 * Note: InstantDB automatically creates accounts when a user first signs in
 * with a magic code. This form provides the same flow but with "Sign Up" branding.
 */

import { useState } from 'react'
import { db } from '@/lib/instant'

/**
 * SignupForm component - Uses InstantDB Magic Code authentication.
 * 
 * Note: InstantDB automatically creates accounts when a user first signs in
 * with a magic code. This form provides the same flow but with "Sign Up" branding.
 * 
 * @returns The signup form JSX
 */
export function SignupForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await db.auth.sendMagicCode({ email })
      setCodeSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await db.auth.signInWithMagicCode({ email, code })
      // Authentication state will be updated automatically via db.useAuth()
      // Account is automatically created if it doesn't exist
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  if (codeSent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <form onSubmit={handleVerifyCode} className="w-full max-w-md space-y-4 p-8">
          <h1 className="text-2xl font-bold text-center">Verify Code</h1>
          <p className="text-sm text-muted-foreground text-center">
            We sent a verification code to {email}
          </p>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
          )}
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-1">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border rounded-md"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Verify Code & Sign Up'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCodeSent(false)
              setCode('')
              setError(null)
            }}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm text-muted-foreground hover:underline"
          >
            Use a different email
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSendCode} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold text-center">Sign Up</h1>
        <p className="text-sm text-muted-foreground text-center">
          Enter your email address and we'll send you a verification code to create your account
        </p>
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Sending code...' : 'Send Verification Code'}
        </button>
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <span className="text-primary hover:underline cursor-pointer">
            Sign in with the same flow
          </span>
        </p>
      </form>
    </div>
  )
}