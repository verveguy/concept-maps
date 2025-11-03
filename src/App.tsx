/**
 * Main application component.
 * Handles authentication routing and renders the appropriate view based on auth state.
 */

import { useEffect } from 'react'
import { db } from '@/lib/instant'
import { LoginForm } from '@/components/auth/LoginForm'
import { MapPage } from '@/pages/MapPage'
import { InvitationPage } from '@/pages/InvitationPage'

/**
 * Root application component.
 * Shows login form if not authenticated, otherwise shows the main map page.
 * 
 * @returns The login form or map page based on authentication state
 */
function App() {
  const auth = db.useAuth()
  const inviteToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('inviteToken')
    : null

  useEffect(() => {
    // Check authentication status
    if (!auth.user) {
      console.log('Not authenticated')
    }
  }, [auth])

  // Show login form if not authenticated
  if (!auth.user) {
    return <LoginForm />
  }

  if (inviteToken) {
    return <InvitationPage inviteToken={inviteToken} />
  }

  // Show main app if authenticated
  return <MapPage />
}

export default App
