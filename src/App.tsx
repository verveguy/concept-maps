/**
 * Main application component.
 * Handles authentication routing and renders the appropriate view based on auth state.
 */

import { useEffect } from 'react'
import { db } from '@/lib/instant'
import { LoginForm } from '@/components/auth/LoginForm'
import { MapPage } from '@/pages/MapPage'
import { InvitationPage } from '@/pages/InvitationPage'
import { useMapStore } from '@/stores/mapStore'

/**
 * Root application component.
 * Shows login form if not authenticated, otherwise shows the main map page.
 * Parses URL path to extract map ID and sets it in the store.
 * 
 * @returns The login form or map page based on authentication state
 */
function App() {
  const auth = db.useAuth()
  const setCurrentMapId = useMapStore((state) => state.setCurrentMapId)
  
  // Extract inviteToken from query params
  const inviteToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('inviteToken')
    : null

  // Parse map ID from URL path (format: /map/{mapId})
  useEffect(() => {
    if (typeof window === 'undefined') return

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')

    // Check for redirect query parameter (from 404.html)
    const urlParams = new URLSearchParams(window.location.search)
    const redirectPath = urlParams.get('redirect')
    
    if (redirectPath) {
      // We were redirected from 404.html, update the URL to the original path
      // redirectPath already includes query params and hash from the original URL
      const newUrl = basePath + decodeURIComponent(redirectPath)
      window.history.replaceState({}, '', newUrl)
    }

    const pathname = window.location.pathname
    // Remove base path if present (e.g., /concept-maps/app)
    const pathWithoutBase = basePath ? pathname.replace(basePath, '') : pathname
    
    // Match /map/{mapId} pattern
    const mapMatch = pathWithoutBase.match(/^\/map\/([^/]+)/)
    if (mapMatch && mapMatch[1]) {
      const mapId = mapMatch[1]
      setCurrentMapId(mapId)
    } else {
      // If no map ID in path, don't change the current map ID
      // (user might have navigated away or be on a different page)
    }
  }, [setCurrentMapId])

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
