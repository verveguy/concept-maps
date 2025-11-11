/**
 * Hook for handling deep linking logic in the concept map canvas.
 * 
 * Provides functionality for:
 * - Concept centering from URL (deep linking)
 * - Auto-selection logic
 * - Viewport management
 * 
 * This hook isolates URL-based navigation logic, making it easier to test
 * and maintain.
 */

import { useEffect, useRef } from 'react'
import type { Node } from 'reactflow'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import type { Concept } from '@/lib/schema'

/**
 * Options for deep linking hook.
 */
export interface UseCanvasDeepLinkingOptions {
  /** Array of concepts from InstantDB */
  concepts: Concept[]
  /** Array of React Flow nodes */
  nodes: Node[]
  /** Function to set nodes (from React Flow) */
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
  /** Function to fit view (from React Flow) */
  fitView: (options?: { padding?: number; duration?: number }) => void
  /** Function to get a node by ID (from React Flow) */
  getNode: (nodeId: string) => Node | undefined
  /** Function to set center (from React Flow) */
  setCenter: (x: number, y: number, options?: { zoom?: number; duration?: number }) => void
  /** Function to get viewport (from React Flow) */
  getViewport: () => { x: number; y: number; zoom: number }
}

/**
 * Hook for deep linking logic.
 * 
 * @param options - Configuration options
 */
export function useCanvasDeepLinking(options: UseCanvasDeepLinkingOptions) {
  const {
    concepts,
    nodes,
    setNodes,
    fitView,
    getNode,
    setCenter,
    getViewport,
  } = options

  const currentConceptId = useMapStore((state) => state.currentConceptId)
  const shouldAutoCenterConcept = useMapStore((state) => state.shouldAutoCenterConcept)
  const setCurrentConceptId = useMapStore((state) => state.setCurrentConceptId)
  const setShouldAutoCenterConcept = useMapStore((state) => state.setShouldAutoCenterConcept)
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)

  // Track if we're currently centering on a concept (to prevent duplicate calls)
  const isCenteringRef = useRef(false)
  // Track if component is mounted (to prevent state updates after unmount)
  const isMountedRef = useRef(true)
  // Track cancellation for async operations
  const cancelledRef = useRef(false)

  /**
   * Wait for zoom change using requestAnimationFrame polling.
   * More reliable than setTimeout as it waits for actual zoom changes.
   */
  const waitForZoomChange = (initialZoom: number, maxTries = 60): Promise<void> => {
    return new Promise((resolve) => {
      let tries = 0
      const check = () => {
        if (cancelledRef.current) return
        const viewport = getViewport()
        if (viewport.zoom !== initialZoom || tries >= maxTries) {
          resolve()
        } else {
          tries++
          requestAnimationFrame(check)
        }
      }
      check()
    })
  }

  /**
   * Handle deep linking to concepts: select and center when concept ID is in URL.
   * This effect watches for URL-based concept navigation and centers the viewport
   * on the specified concept.
   */
  useEffect(() => {
    // Only trigger if auto-centering is enabled and we have a concept ID
    if (!shouldAutoCenterConcept || !currentConceptId) {
      return
    }

    // Wait for concepts to be available (concepts are the source of truth, nodes are derived)
    if (!concepts.length) {
      return
    }

    // Check if the concept exists in the concepts array
    const conceptExists = concepts.some((c) => c.id === currentConceptId)

    if (!conceptExists) {
      return
    }

    // Wait for nodes to be available as well
    if (!nodes.length) {
      return
    }

    // Find the concept node
    const conceptNode = nodes.find((node) => node.id === currentConceptId)
    if (!conceptNode) {
      return
    }

    // Check if we're already centering (prevent duplicate calls)
    if (isCenteringRef.current) {
      return
    }

    // Mark that we're centering
    isCenteringRef.current = true

    // Select the concept FIRST (before clearing flag)
    setSelectedConceptId(currentConceptId)

    // Also select the node in React Flow by updating its selected property
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        if (node.id === currentConceptId) {
          return { ...node, selected: true }
        }
        return { ...node, selected: false }
      })
    })

    // Disable auto-centering flag AFTER selection to prevent re-triggering
    setShouldAutoCenterConcept(false)

    // Center on the concept and fit view to show the whole map
    // Use a promise-based approach to ensure React Flow is ready
    ;(async () => {
      // Small delay to ensure React Flow is ready
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check if component is still mounted before proceeding
      if (!isMountedRef.current || cancelledRef.current) {
        return
      }

      // First fit view to show the whole map (this sets the zoom level)
      const initialZoom = getViewport().zoom
      fitView({ padding: 0.1, duration: 300 })

      // Wait for zoom change to ensure fitView animation completes
      await waitForZoomChange(initialZoom)

      // Check again if component is still mounted
      if (!isMountedRef.current || cancelledRef.current) {
        return
      }

      // After fitView completes, get the current viewport and center on the concept
      const node = getNode(currentConceptId)
      if (node) {
        // Get current viewport to preserve zoom level from fitView
        const viewport = getViewport()
        // Center on the concept node while preserving the zoom from fitView
        setCenter(node.position.x, node.position.y, { zoom: viewport.zoom, duration: 300 })
      }
      // Clear currentConceptId from store after handling to prevent interference with normal selection
      setCurrentConceptId(null)
      // Reset centering flag
      isCenteringRef.current = false
    })().catch((error) => {
      // Handle any errors silently (component may have unmounted)
      if (isMountedRef.current) {
        console.error('Error in deep linking:', error)
      }
    })

    // Cleanup: cancel any pending operations
    return () => {
      cancelledRef.current = true
      isCenteringRef.current = false
    }
  }, [
    shouldAutoCenterConcept,
    currentConceptId,
    concepts,
    nodes,
    setSelectedConceptId,
    setNodes,
    fitView,
    getNode,
    setCenter,
    getViewport,
    setCurrentConceptId,
    setShouldAutoCenterConcept,
  ])

  // Reset centering flag when switching maps
  useEffect(() => {
    isCenteringRef.current = false
  }, [concepts])

  // Track mount state for cleanup
  useEffect(() => {
    isMountedRef.current = true
    cancelledRef.current = false
    return () => {
      isMountedRef.current = false
      cancelledRef.current = true
    }
  }, [])
}

