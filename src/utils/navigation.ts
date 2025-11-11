/**
 * Navigation utilities for deep linking to maps.
 * Handles URL updates for GitHub Pages SPA deployment.
 */

import { useMapStore } from '@/stores/mapStore'

/**
 * Navigate to a concept within a map URL.
 * Updates both the browser URL and the map store.
 * Works with GitHub Pages SPA routing.
 * 
 * @param mapId - The ID of the map to navigate to
 * @param conceptId - The ID of the concept to navigate to
 */
export function navigateToConcept(mapId: string, conceptId: string): void {
  if (typeof window === 'undefined') return

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const newPath = `${basePath}/map/${mapId}/concept/${conceptId}`
  
  console.log('[navigation] navigateToConcept', { mapId, conceptId, newPath })
  
  // Update URL without reloading (works with GitHub Pages 404.html redirect mechanism)
  window.history.pushState({}, '', newPath)
  
  // Update the store directly
  const { setCurrentMapId, setCurrentConceptId, setShouldAutoCenterConcept } = useMapStore.getState()
  console.log('[navigation] Setting store values', { mapId, conceptId, shouldAutoCenter: true })
  setCurrentMapId(mapId)
  setCurrentConceptId(conceptId)
  setShouldAutoCenterConcept(true) // Enable auto-centering for URL navigation
}

/**
 * Navigate to a map URL by map ID.
 * Updates both the browser URL and the map store.
 * Works with GitHub Pages SPA routing.
 * 
 * @param mapId - The ID of the map to navigate to
 * @param clearQueryParams - If true, removes all query parameters from the URL (default: false)
 */
export function navigateToMap(mapId: string, clearQueryParams = false): void {
  if (typeof window === 'undefined') return

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const newPath = `${basePath}/map/${mapId}`
  
  // Update URL without reloading (works with GitHub Pages 404.html redirect mechanism)
  // Use replaceState if clearing query params to avoid adding invitation URL to history
  if (clearQueryParams) {
    window.history.replaceState({}, '', newPath)
    // Dispatch custom event so App.tsx can react to URL changes (since replaceState doesn't trigger popstate)
    window.dispatchEvent(new Event('navigation'))
  } else {
    window.history.pushState({}, '', newPath)
    // Dispatch custom event so App.tsx can react to URL changes
    window.dispatchEvent(new Event('navigation'))
  }
  
  // Update the store directly (App.tsx will sync URL->store on popstate, but we're using pushState)
  const { setCurrentMapId, setCurrentConceptId } = useMapStore.getState()
  setCurrentMapId(mapId)
  setCurrentConceptId(null) // Clear concept ID when navigating to map without concept
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

