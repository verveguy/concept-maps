/**
 * Loading screen component displayed while checking authentication state.
 * Shows a spinner and splash screen image to provide visual feedback
 * during app initialization.
 */

import { Spinner } from '@/components/ui/spinner'

/**
 * Loading screen component.
 * Displays a centered loading spinner with a splash screen image.
 * Used during app initialization to prevent flickering of the sign-in page.
 * 
 * @returns The loading screen JSX element
 */
export function LoadingScreen() {
  // Get base URL for proper asset path resolution in production
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      {/* Splash screen image */}
      <div className="mb-8 relative">
        <img
          src={`${baseUrl}/img/splash_screen.png`}
          alt="Concept Maps"
          className="max-w-xs w-full h-auto"
        />
      </div>
      
      {/* Spinner */}
      <div className="flex items-center gap-2">
        <Spinner className="size-6 text-primary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}

