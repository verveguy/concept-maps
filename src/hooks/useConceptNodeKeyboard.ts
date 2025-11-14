/**
 * Hook for handling keyboard events in concept node editing.
 * 
 * Handles keyboard shortcuts for concept node editing:
 * - Enter: Save current edit
 * - Escape: Cancel current edit
 * - Tab: Create new concept and relationship (when editing label)
 * - Shift+Tab: Navigate to incoming relationship edge
 * 
 * **Tab Key Behavior:**
 * - Creates a new concept positioned 1.5 node widths to the right
 * - Creates a relationship linking current node to new concept
 * - Sets shouldStartEditing flag on the new relationship edge
 * - Fits view to include the new node
 * 
 * **Shift+Tab Behavior:**
 * - Finds the first incoming edge (edge targeting this node)
 * - Sets shouldStartEditing flag on that edge to allow editing
 * 
 * @param isEditing - Whether label is currently being edited
 * @param nodeId - React Flow node ID
 * @param hasWriteAccess - Whether user has write access
 * @param onSave - Callback to save current edit
 * @param onCancel - Callback to cancel current edit
 * @returns Keyboard event handler function
 * 
 * @example
 * ```tsx
 * import { useConceptNodeKeyboard } from '@/hooks/useConceptNodeKeyboard'
 * 
 * function ConceptNode({ nodeId, isEditing }) {
 *   const handleKeyboard = useConceptNodeKeyboard(
 *     isEditing,
 *     nodeId,
 *     hasWriteAccess,
 *     handleSave,
 *     handleCancel
 *   )
 *   
 *   return <input onKeyDown={handleKeyboard} />
 * }
 * ```
 */

import { useCallback } from 'react'
import { useReactFlow } from 'reactflow'
import { db, tx, id } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'

/**
 * Parameters for keyboard hook
 */
export interface UseConceptNodeKeyboardParams {
  /** Whether label is currently being edited */
  isEditing: boolean
  /** React Flow node ID */
  nodeId: string
  /** Whether user has write access */
  hasWriteAccess: boolean
  /** Callback to save current edit */
  onSave: () => Promise<void> | void
  /** Callback to cancel current edit */
  onCancel: () => void
}

/**
 * Hook to handle keyboard events for concept node editing.
 * 
 * @param params - Keyboard hook parameters
 * @returns Keyboard event handler function
 */
export function useConceptNodeKeyboard(params: UseConceptNodeKeyboardParams) {
  const { isEditing, nodeId, hasWriteAccess, onSave, onCancel } = params
  const { getNode, getEdges, setEdges, fitView } = useReactFlow()
  const currentMapId = useMapStore((state) => state.currentMapId)

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      await onSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Tab' && isEditing && !e.shiftKey) {
      e.preventDefault()
      // Save current edit first
      await onSave()
      
      // Create new node and relationship
      if (!currentMapId || !hasWriteAccess) return
      
      // Get current node position
      const currentNode = getNode(nodeId)
      if (!currentNode || !currentNode.position) return
      
      // Estimate node width (same as in ConceptMapCanvas)
      const estimatedNodeWidth = 130
      
      // Calculate position 1.5 node widths to the right
      const newPosition = {
        x: currentNode.position.x + estimatedNodeWidth * 1.5,
        y: currentNode.position.y, // Keep same Y position
      }
      
      try {
        // Generate IDs for both concept and relationship
        const newConceptId = id()
        const newRelationshipId = id()
        
        // Create both concept and relationship in a single transaction
        await db.transact([
          // Create the new concept
          tx.concepts[newConceptId]
            .update({
              label: 'New Concept',
              positionX: newPosition.x,
              positionY: newPosition.y,
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({ map: currentMapId }),
          // Create the relationship linking current node to new concept
          tx.relationships[newRelationshipId]
            .update({
              primaryLabel: 'related to',
              reverseLabel: 'related from',
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({
              map: currentMapId,
              fromConcept: nodeId,
              toConcept: newConceptId,
            }),
        ])
        
        // Wait a bit for the node and edge to appear, then set shouldStartEditing flag and fit view
        setTimeout(() => {
          const edges = getEdges()
          const newEdge = edges.find((edge) => edge.id === newRelationshipId)
          if (newEdge) {
            const updatedEdges = edges.map((edge) => {
              if (edge.id === newRelationshipId) {
                return {
                  ...edge,
                  data: {
                    ...edge.data,
                    shouldStartEditing: true,
                  },
                }
              }
              return edge
            })
            setEdges(updatedEdges)
          }
          
          // Fit view to include the new node
          const newNode = getNode(newConceptId)
          if (newNode) {
            // Use fitView to ensure the new node is visible
            // Small delay to ensure React Flow has updated its internal state
            setTimeout(() => {
              fitView({ 
                padding: 0.2, 
                includeHiddenNodes: false,
                nodes: [newNode],
                duration: 100, // Smooth animation
              })
            }, 50)
          }
        }, 10)
      } catch (error) {
        console.error('Failed to create concept and relationship from Tab:', error)
      }
    } else if (e.key === 'Tab' && isEditing && e.shiftKey) {
      e.preventDefault()
      // Shift+Tab: Find existing relationship and navigate to it
      await onSave()
      
      const edges = getEdges()
      const connectedEdge = edges.find((edge) => edge.target === nodeId)
      
      if (connectedEdge) {
        // Set shouldStartEditing flag on the edge
        const updatedEdges = edges.map((edge) => {
          if (edge.id === connectedEdge.id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                shouldStartEditing: true,
              },
            }
          }
          return edge
        })
        setEdges(updatedEdges)
      }
    }
  }, [isEditing, nodeId, hasWriteAccess, onSave, onCancel, currentMapId, getNode, getEdges, setEdges, fitView])

  return handleKeyDown
}

