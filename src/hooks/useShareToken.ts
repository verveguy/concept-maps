/**
 * Hook to extract share token from URL query parameters.
 * Used for InstantDB permission rules when accessing shared maps via links.
 * 
 * @returns The share token from URL params, or null if not present
 */

import { useMemo } from 'react'

/**
 * Get the share token from URL query parameters.
 * Extracts the 'shareToken' parameter from the current URL.
 * 
 * @returns Share token string or null if not present
 */
export function useShareToken(): string | null {
  return useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const params = new URLSearchParams(window.location.search)
    return params.get('shareToken')
  }, []) // Empty deps since URL won't change in this SPA
}
