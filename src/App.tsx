/**
 * Main application component.
 * Handles authentication routing and renders the appropriate view based on auth state.
 */

import { useEffect, useState, useRef } from 'react'
import { db } from '@/lib/instant'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingScreen } from '@/components/auth/LoadingScreen'
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
  const setCurrentConceptId = useMapStore((state) => state.setCurrentConceptId)
  const setShouldAutoCenterConcept = useMapStore((state) => state.setShouldAutoCenterConcept)
  
  // Track if auth has been initialized to prevent showing login form during initial check
  const authInitialized = useRef(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const mountTimeRef = useRef<number | null>(null)
  
  // Extract inviteToken from query params (reactive to URL changes)
  const [inviteToken, setInviteToken] = useState<string | null>(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('inviteToken')
      : null
  )
  
  // Record mount time
  useEffect(() => {
    mountTimeRef.current = Date.now()
  }, [])

  // Parse map ID from URL path (format: /map/{mapId})
  // Listens to both initial load and navigation events (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')

    /**
     * Extract and set map ID from current URL path.
     * Also updates inviteToken state when URL changes.
     */
    const updateMapIdFromUrl = () => {
      // Check for redirect query parameter (from 404.html)
      const urlParams = new URLSearchParams(window.location.search)
      const redirectPath = urlParams.get('redirect')
      
      if (redirectPath) {
        // We were redirected from 404.html, update the URL to the original path
        // redirectPath already includes query params and hash from the original URL
        const newUrl = basePath + decodeURIComponent(redirectPath)
        window.history.replaceState({}, '', newUrl)
      }

      // Update inviteToken from current URL query params
      const currentInviteToken = urlParams.get('inviteToken')
      setInviteToken(currentInviteToken)

      const pathname = window.location.pathname
      // Remove base path if present (e.g., /concept-maps/app)
      const pathWithoutBase = basePath ? pathname.replace(basePath, '') : pathname
      
      // Match /map/{mapId}/concept/{conceptId} or /map/{mapId} pattern
      const conceptMatch = pathWithoutBase.match(/^\/map\/([^/]+)\/concept\/([^/]+)/)
      const mapMatch = pathWithoutBase.match(/^\/map\/([^/]+)/)
      
      if (conceptMatch && conceptMatch[1] && conceptMatch[2]) {
        // URL has both map ID and concept ID
        const mapId = conceptMatch[1]
        const conceptId = conceptMatch[2]
        setCurrentMapId(mapId)
        setCurrentConceptId(conceptId)
        setShouldAutoCenterConcept(true) // Enable auto-centering for URL navigation
      } else if (mapMatch && mapMatch[1]) {
        // URL has only map ID
        const mapId = mapMatch[1]
        setCurrentMapId(mapId)
        setCurrentConceptId(null) // Clear concept ID when navigating to map without concept
        setShouldAutoCenterConcept(false) // Disable auto-centering
      } else {
        // If no map ID in path, clear both
        setCurrentMapId(null)
        setCurrentConceptId(null)
        setShouldAutoCenterConcept(false)
      }
    }

    // Update on mount
    updateMapIdFromUrl()

    // Listen for browser navigation events (back/forward buttons)
    window.addEventListener('popstate', updateMapIdFromUrl)
    
    // Listen for custom navigation events (for programmatic navigation via replaceState/pushState)
    const handleNavigation = () => {
      updateMapIdFromUrl()
    }
    window.addEventListener('navigation', handleNavigation)

    return () => {
      window.removeEventListener('popstate', updateMapIdFromUrl)
      window.removeEventListener('navigation', handleNavigation)
    }
  }, [setCurrentMapId, setCurrentConceptId, setShouldAutoCenterConcept])

  // Track auth initialization to prevent flickering
  useEffect(() => {
    // Check if auth has been initialized
    // Always show loading screen for at least 2 seconds for a smooth user experience
    const checkAuthInitialized = () => {
      const timeSinceMount = mountTimeRef.current ? Date.now() - mountTimeRef.current : 0
      const minLoadingTime = 2000 // Minimum loading time: 2 seconds
      
      // If we have a user, auth is definitely initialized
      if (auth.user) {
        if (!authInitialized.current) {
          authInitialized.current = true
          // Ensure minimum loading time for smooth transition
          const remainingTime = Math.max(0, minLoadingTime - timeSinceMount)
          setTimeout(() => {
            setIsAuthLoading(false)
          }, remainingTime)
        }
        return
      }
      
      // If no user, wait for minimum loading time to ensure smooth experience
      // This prevents showing login form immediately when user is actually authenticated
      if (!authInitialized.current && timeSinceMount >= minLoadingTime) {
        authInitialized.current = true
        setIsAuthLoading(false)
      }
    }
    
    checkAuthInitialized()
  }, [auth.user])

  // Show loading screen while checking authentication
  if (isAuthLoading || !authInitialized.current) {
    return <LoadingScreen />
  }

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
