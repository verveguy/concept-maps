/**
 * Navigation utilities for deep linking to maps.
 * Handles URL updates for GitHub Pages SPA deployment.
 */

import { useMapStore } from '@/stores/mapStore'

/**
 * Navigate to a map URL by map ID.
 * Updates both the browser URL and the map store.
 * Works with GitHub Pages SPA routing.
 * 
 * @param mapId - The ID of the map to navigate to
 */
export function navigateToMap(mapId: string): void {
  if (typeof window === 'undefined') return

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const newPath = `${basePath}/map/${mapId}`
  
  // Update URL without reloading (works with GitHub Pages 404.html redirect mechanism)
  window.history.pushState({}, '', newPath)
  
  // Update the store directly (App.tsx will sync URL->store on popstate, but we're using pushState)
  const { setCurrentMapId } = useMapStore.getState()
  setCurrentMapId(mapId)
}

/**
 * Navigate to the app root (no map selected).
 * Updates both the browser URL and the map store.
 * 
 * @param preserveQueryParams - If true, preserves query parameters (like inviteToken)
 */
export function navigateToRoot(preserveQueryParams = false): void {
  if (typeof window === 'undefined') return

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const search = preserveQueryParams ? window.location.search : ''
  const newPath = `${basePath}${search}`
  
  window.history.pushState({}, '', newPath)
  
  // Clear the map ID in the store
  const { setCurrentMapId } = useMapStore.getState()
  setCurrentMapId(null)
}

