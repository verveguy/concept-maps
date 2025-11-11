/**
 * Hook for managing layout operations in the concept map canvas.
 * 
 * Provides functionality for:
 * - Applying layout algorithms (force-directed, hierarchical, circular, layered, stress)
 * - Sticky layout behavior (auto-apply when new nodes are added)
 * - Incremental layout (only layout new nodes, keep existing positions)
 * - Auto-layout triggers (watch for new concepts and re-apply layout)
 * 
 * This hook centralizes all layout logic, making it easier to test and maintain.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Node, Edge } from 'reactflow'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import { db, tx } from '@/lib/instant'
import type { LayoutType } from '@/lib/layouts'
import {
  applyForceDirectedLayout,
  applyHierarchicalLayout,
  applyCircularLayout,
  applyLayeredLayout,
  applyStressLayout,
} from '@/lib/layouts'

/**
 * Options for layout hook.
 */
export interface UseCanvasLayoutOptions {
  /** Array of React Flow nodes */
  nodes: Node[]
  /** Array of React Flow edges */
  edges: Edge[]
  /** Array of concept IDs (for tracking changes) */
  conceptIds: string[]
  /** Function to get all nodes (from React Flow) */
  getNodes: () => Node[]
  /** Function to get all edges (from React Flow) */
  getEdges: () => Edge[]
  /** Function to fit view to nodes */
  fitView: (options?: { padding?: number }) => void
}

/**
 * Hook for layout management.
 * 
 * @param options - Configuration options
 * @returns Object containing layout functions and state
 */
export function useCanvasLayout(options: UseCanvasLayoutOptions) {
  const {
    conceptIds,
    getNodes,
    getEdges,
    fitView,
  } = options

  const {
    activeLayout,
    setActiveLayout,
    selectedLayout,
    setSelectedLayout,
    laidOutNodeIds,
    addLaidOutNodeId,
    setPrevConceptIds,
  } = useCanvasStore()

  const currentMapId = useMapStore((state) => state.currentMapId)

  /**
   * Apply a layout algorithm to the concept nodes.
   * 
   * @param layoutType - The layout algorithm to apply
   * @param makeSticky - Whether to make this layout sticky (auto-apply on new nodes)
   * @param incremental - Whether to use incremental layout (only layout new nodes)
   * @returns Promise that resolves when layout is applied
   */
  const applyLayout = useCallback(
    async (layoutType: LayoutType, makeSticky: boolean = false, incremental: boolean = false) => {
      if (!currentMapId) return
      
      // Use getNodes/getEdges to get the latest state (important for auto-apply)
      const currentNodes = getNodes()
      const currentEdges = getEdges()
      
      const conceptNodesArray = currentNodes.filter(n => n.type === 'concept')
      if (conceptNodesArray.length === 0) return

      // For incremental layout, identify new nodes
      const newConceptIds = incremental 
        ? new Set(conceptNodesArray.filter(n => !laidOutNodeIds.has(n.id)).map(n => n.id))
        : undefined
      const fixedNodeIds = incremental && laidOutNodeIds.size > 0
        ? laidOutNodeIds
        : undefined

      let layoutNodes: Node[]
      
      if (layoutType === 'force-directed') {
        layoutNodes = applyForceDirectedLayout(conceptNodesArray, currentEdges, {
          width: 2000,
          height: 2000,
          fixedNodeIds,
          newNodeIds: newConceptIds,
        })
      } else if (layoutType === 'hierarchical') {
        layoutNodes = applyHierarchicalLayout(conceptNodesArray, currentEdges, {
          direction: 'TB',
          nodeWidth: 150,
          nodeHeight: 100,
        })
      } else if (layoutType === 'circular') {
        layoutNodes = applyCircularLayout(conceptNodesArray, currentEdges, {
          width: 2000,
          height: 2000,
        })
      } else if (layoutType === 'layered') {
        layoutNodes = await applyLayeredLayout(conceptNodesArray, currentEdges, {
          width: 2000,
          height: 2000,
          direction: 'DOWN',
        })
      } else if (layoutType === 'stress') {
        layoutNodes = await applyStressLayout(conceptNodesArray, currentEdges, {
          width: 2000,
          height: 2000,
          nodeSpacing: 600, // Very generous spacing for less dense layout
          edgeNodeSpacing: 150,
        })
      } else {
        // Manual layout - clear active layout
        setActiveLayout(null)
        return
      }

      // Update selected layout to show on button
      setSelectedLayout(layoutType)
      
      // Set active layout for sticky behavior only if makeSticky is true
      if (makeSticky) {
        setActiveLayout(layoutType)
      } else {
        setActiveLayout(null)
      }

      // Batch update all concept positions in InstantDB
      try {
        // For incremental layout, only update new nodes
        const nodesToUpdate = incremental && newConceptIds
          ? layoutNodes.filter(n => newConceptIds.has(n.id))
          : layoutNodes
        
        const updates = nodesToUpdate.map((node) =>
          tx.concepts[node.id].update({
            positionX: node.position.x,
            positionY: node.position.y,
            updatedAt: Date.now(),
          })
        )
        await db.transact(updates)
        
        // Update laid-out nodes tracking
        if (incremental && newConceptIds) {
          newConceptIds.forEach(id => addLaidOutNodeId(id))
        } else {
          // Full layout - mark all nodes as laid out
          conceptNodesArray.forEach((node) => {
            addLaidOutNodeId(node.id)
          })
        }
        
        // Fit view to show all nodes after layout
        setTimeout(() => {
          fitView({ padding: 0.1 })
        }, 100)
      } catch (error) {
        console.error('Failed to apply layout:', error)
        alert('Failed to apply layout. Please try again.')
      }
    },
    [
      currentMapId,
      getNodes,
      getEdges,
      laidOutNodeIds,
      addLaidOutNodeId,
      setActiveLayout,
      setSelectedLayout,
      fitView,
    ]
  )

  /**
   * Simple layout application (for ref API, always full layout, not sticky).
   * Used by the imperative ref API.
   */
  const applyLayoutSimple = useCallback(
    async (layoutType: LayoutType) => {
      await applyLayout(layoutType, false, false)
    },
    [applyLayout]
  )

  // Use a ref to store the latest applyLayout function to avoid dependency issues
  const applyLayoutRef = useRef(applyLayout)
  useEffect(() => {
    applyLayoutRef.current = applyLayout
  }, [applyLayout])

  // Memoize concept IDs string for comparison
  const conceptIdsString = useMemo(
    () => Array.from(conceptIds).sort().join(','),
    [conceptIds]
  )

  // Auto-apply layout when new concepts are added (if sticky layout is active)
  useEffect(() => {
    // Get current store state inside effect to avoid dependency issues
    const currentPrevConceptIds = useCanvasStore.getState().prevConceptIds
    const currentLaidOutNodeIds = useCanvasStore.getState().laidOutNodeIds
    
    if (!activeLayout) {
      // Only update store if concept IDs actually changed
      const currentConceptIds = new Set(conceptIds)
      const prevIdsString = Array.from(currentPrevConceptIds).sort().join(',')
      const currentIdsString = Array.from(currentConceptIds).sort().join(',')
      
      if (prevIdsString !== currentIdsString) {
        setPrevConceptIds(currentConceptIds)
      }
      return
    }
    
    const currentConceptIds = new Set(conceptIds)
    const previousConceptIds = currentPrevConceptIds
    
    // Check if any new concepts were added (not just count change)
    const newConceptIds = Array.from(currentConceptIds).filter(id => !previousConceptIds.has(id))
    
    // If new nodes were added and we have an active layout, re-apply it
    if (newConceptIds.length > 0 && conceptIds.length > 0) {
      // Small delay to ensure the new node is fully created and edges are updated
      const timeoutId = setTimeout(() => {
        // Use incremental layout for force-directed, full layout for others
        const useIncremental = activeLayout === 'force-directed' && currentLaidOutNodeIds.size > 0
        // Use ref to access latest applyLayout without adding it to dependencies
        applyLayoutRef.current(activeLayout, true, useIncremental).catch((error) => {
          console.error('Failed to auto-apply layout:', error)
        })
      }, 300)
      
      // Update store for next comparison
      setPrevConceptIds(currentConceptIds)
      
      return () => clearTimeout(timeoutId)
    }
    
    // Only update store if concept IDs actually changed (avoid unnecessary updates)
    const prevIdsString = Array.from(previousConceptIds).sort().join(',')
    const currentIdsString = Array.from(currentConceptIds).sort().join(',')
    
    if (prevIdsString !== currentIdsString) {
      setPrevConceptIds(currentConceptIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptIdsString, activeLayout]) // Removed applyLayout from dependencies

  return {
    applyLayout,
    applyLayoutSimple,
    activeLayout,
    selectedLayout,
    setSelectedLayout,
  }
}

