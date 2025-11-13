/**
 * Hook for managing layout operations in the concept map canvas.
 * 
 * Provides functionality for:
 * - Applying layout algorithms (force-directed, hierarchical, layered)
 * - Incremental layout (only layout new nodes, keep existing positions)
 * 
 * This hook centralizes all layout logic, making it easier to test and maintain.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Node, Edge } from 'reactflow'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import { useUndoStore } from '@/stores/undoStore'
import type {
  UpdateConceptCommand,
  UpdateCommentCommand,
} from '@/stores/undoStore'
import { db, tx } from '@/lib/instant'
import type { LayoutType } from '@/lib/layouts'
import type { Concept, Comment } from '@/lib/schema'
import {
  applyForceDirectedLayout,
  applyHierarchicalLayout,
  applyLayeredLayout,
} from '@/lib/layouts'
import { useMapActions } from '@/hooks/useMapActions'

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
  /** Array of concepts (for checking userPlaced) */
  concepts: Concept[]
  /** Array of comments (for checking userPlaced) */
  comments: Comment[]
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
    concepts,
    comments,
    getNodes,
    getEdges,
    fitView,
  } = options

  const {
    selectedLayout,
    setSelectedLayout,
  } = useCanvasStore()

  const {
    recordMutation,
    startOperation,
    endOperation,
  } = useUndoStore()

  const currentMapId = useMapStore((state) => state.currentMapId)
  const { updateMap } = useMapActions()

  /**
   * Apply a layout algorithm to the concept nodes.
   * 
   * @param layoutType - The layout algorithm to apply
   * @param incremental - Whether to use incremental layout (only layout new nodes, freeze existing ones)
   * @returns Promise that resolves when layout is applied
   */
  const applyLayout = useCallback(
    async (layoutType: LayoutType, incremental: boolean = false) => {
      if (!currentMapId) return
      
      // Use getNodes/getEdges to get the latest state (important for auto-apply)
      const currentNodes = getNodes()
      const currentEdges = getEdges()
      
      // Include both concept and comment nodes in layout
      // Filter out text-view nodes and any other node types we don't want to layout
      const layoutableNodes = currentNodes.filter(n => n.type === 'concept' || n.type === 'comment')
      if (layoutableNodes.length === 0) return

      // Create a map of node ID to userPlaced status for quick lookup
      const userPlacedMap = new Map<string, boolean>()
      concepts.forEach(c => {
        userPlacedMap.set(c.id, c.userPlaced === true)
      })
      comments.forEach(c => {
        userPlacedMap.set(c.id, c.userPlaced === true)
      })

      // For full layout: clear userPlaced flag on all nodes first
      // This allows the layout algorithm to reposition everything
      // Note: This is handled as part of the layout operation commands below,
      // so we don't need separate commands here - the userPlaced flag will be
      // updated along with positions in the main transaction

      // For incremental layout: only freeze nodes that were user-placed
      // For full layout: no nodes are frozen (all can be repositioned)
      const fixedNodeIds = incremental
        ? new Set(layoutableNodes.filter(n => userPlacedMap.get(n.id) === true).map(n => n.id))
        : undefined
      
      // For incremental layout: identify nodes that need positioning
      // (nodes that are NOT user-placed)
      const newNodeIds = incremental
        ? new Set(layoutableNodes.filter(n => userPlacedMap.get(n.id) !== true).map(n => n.id))
        : undefined

      let layoutNodes: Node[]
      
      if (layoutType === 'force-directed') {
        layoutNodes = applyForceDirectedLayout(layoutableNodes, currentEdges, {
          width: 2000,
          height: 2000,
          fixedNodeIds,
          newNodeIds,
        })
      } else if (layoutType === 'hierarchical') {
        // For incremental hierarchical layout, preserve positions of fixed nodes
        // by only updating new nodes' positions relative to existing structure
        if (incremental && fixedNodeIds && fixedNodeIds.size > 0 && newNodeIds && newNodeIds.size > 0) {
          // In incremental mode, we need to preserve existing node positions
          // and only layout new nodes. However, hierarchical layouts work best
          // with full graph structure, so we'll do a full layout but preserve
          // the relative positions of existing nodes where possible.
          const fullLayoutNodes = applyHierarchicalLayout(layoutableNodes, currentEdges, {
            direction: 'TB',
            nodeWidth: 150,
            nodeHeight: 100,
          })
          
          // Preserve positions of fixed nodes from their current positions
          layoutNodes = fullLayoutNodes.map(node => {
            if (fixedNodeIds.has(node.id)) {
              // Keep the original position for fixed nodes
              const originalNode = layoutableNodes.find(n => n.id === node.id)
              if (originalNode) {
                return {
                  ...node,
                  position: originalNode.position,
                }
              }
            }
            return node
          })
        } else {
          layoutNodes = applyHierarchicalLayout(layoutableNodes, currentEdges, {
            direction: 'TB',
            nodeWidth: 150,
            nodeHeight: 100,
          })
        }
      } else if (layoutType === 'layered') {
        // For incremental layered layout, preserve positions of fixed nodes
        if (incremental && fixedNodeIds && fixedNodeIds.size > 0 && newNodeIds && newNodeIds.size > 0) {
          const fullLayoutNodes = await applyLayeredLayout(layoutableNodes, currentEdges, {
            width: 2000,
            height: 2000,
            direction: 'DOWN',
          })
          
          // Preserve positions of fixed nodes from their current positions
          layoutNodes = fullLayoutNodes.map(node => {
            if (fixedNodeIds.has(node.id)) {
              const originalNode = layoutableNodes.find(n => n.id === node.id)
              if (originalNode) {
                return {
                  ...node,
                  position: originalNode.position,
                }
              }
            }
            return node
          })
        } else {
          layoutNodes = await applyLayeredLayout(layoutableNodes, currentEdges, {
            width: 2000,
            height: 2000,
            direction: 'DOWN',
          })
        }
      } else {
        // Manual layout - return early
        return
      }

      // Update selected layout to show on button
      setSelectedLayout(layoutType)

      // Save layout algorithm to map for persistence and concurrent editing
      if (currentMapId) {
        try {
          await updateMap(currentMapId, { layoutAlgorithm: layoutType })
        } catch (error) {
          // Log error but don't fail the layout operation if map update fails
          console.error('Failed to save layout algorithm to map:', error)
        }
      }

      // Batch update all node positions in InstantDB (both concepts and comments)
      // Wrap in undo/redo command pattern
      try {
        // Start operation to group all layout updates as a single undoable action
        startOperation()
        const operationId = useUndoStore.getState().currentOperationId || `op_${Date.now()}`
        
        // When doing a full layout (not incremental), update ALL nodes
        // When doing incremental layout, only update new nodes
        const nodesToUpdate = incremental && newNodeIds && newNodeIds.size > 0
          ? layoutNodes.filter(n => newNodeIds.has(n.id))
          : layoutNodes
        
        // Capture previous positions for undo commands
        const previousPositions = new Map<string, { x: number; y: number; userPlaced?: boolean }>()
        layoutableNodes.forEach(node => {
          if (node.type === 'concept') {
            const concept = concepts.find(c => c.id === node.id)
            if (concept) {
              previousPositions.set(node.id, {
                x: concept.position.x,
                y: concept.position.y,
                userPlaced: concept.userPlaced,
              })
            }
          } else if (node.type === 'comment') {
            const comment = comments.find(c => c.id === node.id)
            if (comment) {
              previousPositions.set(node.id, {
                x: comment.position.x,
                y: comment.position.y,
                userPlaced: comment.userPlaced,
              })
            }
          }
        })
        
        // Validate positions before updating - filter out any nodes with invalid positions
        const validNodesToUpdate = nodesToUpdate.filter((node) => {
          const x = node.position.x
          const y = node.position.y
          const isValid = typeof x === 'number' && typeof y === 'number' &&
                         !isNaN(x) && !isNaN(y) &&
                         isFinite(x) && isFinite(y)
          if (!isValid) {
            console.warn(`Skipping update for node ${node.id}: invalid position (x: ${x}, y: ${y})`)
          }
          return isValid
        })
        
        if (validNodesToUpdate.length === 0) {
          endOperation()
          console.error('No valid node positions to update')
          throw new Error('Layout algorithm did not produce valid positions for any nodes')
        }
        
        // Create database transaction updates
        const dbUpdates = validNodesToUpdate
          .map((node) => {
            // Update concepts or comments based on node type
            // Set userPlaced = false since layout algorithm positioned this node
            if (node.type === 'concept') {
              return tx.concepts[node.id].update({
                positionX: node.position.x,
                positionY: node.position.y,
                userPlaced: false, // Layout algorithm placed this node
                updatedAt: Date.now(),
              })
            } else if (node.type === 'comment') {
              return tx.comments[node.id].update({
                positionX: node.position.x,
                positionY: node.position.y,
                userPlaced: false, // Layout algorithm placed this node
                updatedAt: Date.now(),
              })
            } else {
              // Should not happen, but handle gracefully
              console.warn(`Unknown node type for node ${node.id}: ${node.type}`)
              return null
            }
          })
          .filter((update) => update !== null) // Remove any null updates
        
        // Create undo commands for each node update
        const commands: (UpdateConceptCommand | UpdateCommentCommand)[] = []
        validNodesToUpdate.forEach((node) => {
          const previousState = previousPositions.get(node.id)
          if (!previousState) return // Skip if we don't have previous state
          
          // Check if position or userPlaced actually changed
          const positionChanged = 
            previousState.x !== node.position.x ||
            previousState.y !== node.position.y
          const userPlacedChanged = previousState.userPlaced !== false
          
          // Create command if position or userPlaced changed
          if (!positionChanged && !userPlacedChanged) return // Skip if nothing changed
          
          if (node.type === 'concept') {
            const command: UpdateConceptCommand = {
              type: 'updateConcept',
              id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              operationId,
              conceptId: node.id,
              updates: {
                position: { x: node.position.x, y: node.position.y },
                userPlaced: false,
              },
              previousState: {
                position: { x: previousState.x, y: previousState.y },
                userPlaced: previousState.userPlaced,
              },
            }
            commands.push(command)
          } else if (node.type === 'comment') {
            const command: UpdateCommentCommand = {
              type: 'updateComment',
              id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              operationId,
              commentId: node.id,
              updates: {
                position: { x: node.position.x, y: node.position.y },
                userPlaced: false,
              },
              previousState: {
                position: { x: previousState.x, y: previousState.y },
                userPlaced: previousState.userPlaced,
              },
            }
            commands.push(command)
          }
        })
        
        // Execute database transaction
        await db.transact(dbUpdates)
        
        // Record all commands for undo/redo
        commands.forEach(command => {
          recordMutation(command)
        })
        
        // End operation
        endOperation()
        
        // Fit view to show all nodes after layout
        setTimeout(() => {
          fitView({ padding: 0.1 })
        }, 100)
      } catch (error) {
        // Ensure operation is ended even if there's an error
        endOperation()
        console.error('Failed to apply layout:', error)
        alert('Failed to apply layout. Please try again.')
      }
    },
    [
      currentMapId,
      concepts,
      comments,
      getNodes,
      getEdges,
      setSelectedLayout,
      fitView,
      recordMutation,
      startOperation,
      endOperation,
      updateMap,
    ]
  )

  /**
   * Simple layout application (for ref API, always full layout).
   * Used by the imperative ref API.
   */
  const applyLayoutSimple = useCallback(
    async (layoutType: LayoutType) => {
      await applyLayout(layoutType, false)
    },
    [applyLayout]
  )

  /**
   * Apply incremental layout for a newly created node (e.g., from triple entry mode).
   * This freezes all user-placed nodes and only positions the new node(s).
   * 
   * @param newNodeIds - Set of node IDs that were just created and need positioning
   * @param layoutType - Optional layout type to use (defaults to selectedLayout)
   * @returns Promise that resolves when layout is applied
   */
  const applyIncrementalLayoutForNewNodes = useCallback(
    async (newNodeIds: Set<string>, layoutType?: LayoutType) => {
      if (!currentMapId || newNodeIds.size === 0) return
      
      // Use the provided layout type or fall back to selected layout
      const layoutToUse = layoutType || selectedLayout
      if (!layoutToUse || layoutToUse === 'manual') {
        // No layout selected, skip incremental layout
        return
      }
      
      // Small delay to ensure the new node is fully created and edges are updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Apply incremental layout (will automatically freeze user-placed nodes)
      await applyLayout(layoutToUse, true)
    },
    [currentMapId, selectedLayout, applyLayout]
  )

  return {
    applyLayout,
    applyLayoutSimple,
    applyIncrementalLayoutForNewNodes,
    selectedLayout,
    setSelectedLayout,
  }
}

