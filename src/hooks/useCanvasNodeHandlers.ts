/**
 * Hook for handling node-related events in the concept map canvas.
 * 
 * Provides handlers for:
 * - Node changes (deletions)
 * - Node dragging (with throttling)
 * - Node click events
 * 
 * This hook centralizes all node interaction logic, making it easier to test
 * and maintain.
 */

import { useCallback } from 'react'
import type { Node, NodeChange } from 'reactflow'
import { useCanvasMutations } from './useCanvasMutations'
import { useCanvasStore } from '@/stores/canvasStore'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useMapPermissions } from './useMapPermissions'
import { usePresenceCursorSetter } from './usePresenceCursorSetter'
import type { Concept, Comment, Relationship } from '@/lib/schema'

const THROTTLE_MS = 100 // Update every 100ms maximum

/**
 * Options for node handlers hook.
 */
export interface UseCanvasNodeHandlersOptions {
  /** Array of concept nodes */
  concepts: Concept[]
  /** Array of comment nodes */
  comments: Comment[]
  /** Array of relationship edges */
  relationships: Relationship[]
  /** Array of React Flow nodes */
  nodes: Node[]
  /** Base handler from useNodesState */
  onNodesChangeBase: (changes: NodeChange[]) => void
  /** Function to convert screen coordinates to flow coordinates */
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number }
}

/**
 * Hook for node event handlers.
 * 
 * @param options - Configuration options
 * @returns Object containing node event handlers
 */
export function useCanvasNodeHandlers(options: UseCanvasNodeHandlersOptions) {
  const {
    concepts,
    comments,
    relationships,
    nodes,
    onNodesChangeBase,
    screenToFlowPosition,
  } = options

  const {
    deleteConcept,
    deleteComment,
    deleteRelationship,
    updateConcept,
    updateComment,
    startOperation,
    endOperation,
  } = useCanvasMutations()

  const {
    getLastUpdateTime,
    setLastUpdateTime,
    connectionStart,
  } = useCanvasStore()

  const {
    setSelectedConceptId,
    setSelectedCommentId,
    setConceptEditorOpen,
  } = useUIStore()

  const currentMapId = useMapStore((state) => state.currentMapId)
  const { hasWriteAccess } = useMapPermissions()
  const { setCursor } = usePresenceCursorSetter()
  const { setTextViewPosition } = useUIStore()

  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const selectedCommentId = useUIStore((state) => state.selectedCommentId)

  /**
   * Handle node changes (deletions, etc.)
   * Intercepts deletions and removes items from database.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Filter out remove actions for concept nodes and delete from database
      const removeChanges = changes.filter(
        (change) => change.type === 'remove' && change.id !== 'text-view-node'
      )

      // If user doesn't have write access, prevent deletions by filtering out remove changes
      if (removeChanges.length > 0 && !hasWriteAccess) {
        // Filter out remove changes before calling base handler
        const filteredChanges = changes.filter((change) => change.type !== 'remove' || change.id === 'text-view-node')
        onNodesChangeBase(filteredChanges)
        return
      }

      if (removeChanges.length > 0 && hasWriteAccess && currentMapId) {
        // Check if selected concept is being deleted
        const deletedConceptIds = removeChanges
          .map((change) => change.type === 'remove' ? change.id : undefined)
          .filter((id): id is string => id !== undefined)
        
        if (selectedConceptId && deletedConceptIds.includes(selectedConceptId)) {
          setSelectedConceptId(null)
          setConceptEditorOpen(false)
        }
        
        // Check if selected comment is being deleted
        if (selectedCommentId && deletedConceptIds.includes(selectedCommentId)) {
          setSelectedCommentId(null)
        }

        // Delete concepts from database
        void (async () => {
          try {
            // Start a deletion operation to group related deletions
            startOperation()
            
            // Find all relationships connected to deleted concepts
            const deletedConceptIds = removeChanges
              .map((change) => change.type === 'remove' ? change.id : undefined)
              .filter((id): id is string => id !== undefined)
            
            const connectedRelationships = relationships.filter(
              (r) => deletedConceptIds.includes(r.fromConceptId) || deletedConceptIds.includes(r.toConceptId)
            )
            
            // Delete relationships connected to deleted concepts (before deleting concepts)
            // This ensures relationships are deleted and recorded before concepts
            const relationshipDeletePromises = connectedRelationships.map((rel) => {
              return deleteRelationship(rel.id)
            })
            
            // Delete concepts
            const conceptDeletePromises = removeChanges.map((change) => {
              if (change.type === 'remove' && change.id) {
                // Only delete if it's a concept node (not text-view node)
                const node = nodes.find((n) => n.id === change.id)
                if (node && node.type === 'concept') {
                  return deleteConcept(change.id)
                } else if (node && node.type === 'comment') {
                  return deleteComment(change.id)
                }
              }
              return Promise.resolve()
            })
            
            // Execute all deletions
            await Promise.all([...relationshipDeletePromises, ...conceptDeletePromises])
            
            // End the deletion operation
            endOperation()
          } catch (error) {
            console.error('Failed to delete concepts:', error)
            alert('Failed to delete concepts. Please try again.')
            // End operation even on error
            endOperation()
          }
        })()
      }

      // Always call the base handler to update React Flow state
      onNodesChangeBase(changes)
    },
    [
      hasWriteAccess,
      currentMapId,
      deleteConcept,
      deleteRelationship,
      deleteComment,
      nodes,
      relationships,
      onNodesChangeBase,
      selectedConceptId,
      selectedCommentId,
      setSelectedConceptId,
      setSelectedCommentId,
      setConceptEditorOpen,
      startOperation,
      endOperation,
    ]
  )

  /**
   * Handle node drag - update position in database with throttling.
   * Skips position updates if connection creation is in progress (Handle drag).
   */
  const onNodeDrag = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!currentMapId || !hasWriteAccess) return

      // Handle text view node position update (no throttling needed for UI state)
      if (node.id === 'text-view-node') {
        setTextViewPosition(node.position)
        return
      }

      // Skip position updates if connection creation is in progress (Handle drag)
      // This prevents the node from moving while creating a connection from any Handle
      // (center handle or expanded Option-drag handle). React Flow may still fire
      // onNodeDrag events during Handle drags, so this check ensures nodes don't move.
      if (connectionStart && connectionStart.sourceId === node.id) {
        // Still update cursor position for presence, but don't update node position
        const flowPosition = screenToFlowPosition({
          x: _event.clientX,
          y: _event.clientY,
        })
        setCursor(flowPosition)
        return
      }

      const concept = concepts.find((c) => c.id === node.id)
      const comment = comments.find((c) => c.id === node.id)
      
      if (!concept && !comment) return

      // Update cursor position during drag to keep remote viewers' cursors in sync
      const flowPosition = screenToFlowPosition({
        x: _event.clientX,
        y: _event.clientY,
      })
      setCursor(flowPosition)

      // Check if enough time has passed since last update
      const now = Date.now()
      const lastUpdate = getLastUpdateTime(node.id) || 0
      const timeSinceLastUpdate = now - lastUpdate

      // Only update if throttle interval has passed
      if (timeSinceLastUpdate >= THROTTLE_MS) {
        setLastUpdateTime(node.id, now)
        
        try {
          if (concept) {
            await updateConcept(node.id, {
              position: { x: node.position.x, y: node.position.y },
            })
          } else if (comment) {
            await updateComment(node.id, {
              position: { x: node.position.x, y: node.position.y },
            })
          }
        } catch (error) {
          console.error(`Failed to update node ${node.id} position:`, error)
        }
      }
    },
    [
      currentMapId,
      concepts,
      comments,
      updateConcept,
      updateComment,
      setTextViewPosition,
      screenToFlowPosition,
      setCursor,
      hasWriteAccess,
      getLastUpdateTime,
      setLastUpdateTime,
      connectionStart,
    ]
  )

  /**
   * Handle node drag end - ensure final position is saved.
   */
  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!currentMapId || !hasWriteAccess) return
      
      // Handle text view node position update
      if (node.id === 'text-view-node') {
        setTextViewPosition(node.position)
        return
      }

      const concept = concepts.find((c) => c.id === node.id)
      const comment = comments.find((c) => c.id === node.id)
      
      if (!concept && !comment) return

      // Update cursor position to final position
      const flowPosition = screenToFlowPosition({
        x: _event.clientX,
        y: _event.clientY,
      })
      setCursor(flowPosition)

      // Always save final position immediately on drag stop
      if (concept) {
        if (
          concept.position.x !== node.position.x ||
          concept.position.y !== node.position.y
        ) {
          try {
            await updateConcept(node.id, {
              position: { x: node.position.x, y: node.position.y },
            })
            // Update last update time so we don't trigger another update unnecessarily
            setLastUpdateTime(node.id, Date.now())
          } catch (error) {
            console.error('Failed to update concept position:', error)
          }
        }
      } else if (comment) {
        if (
          comment.position.x !== node.position.x ||
          comment.position.y !== node.position.y
        ) {
          try {
            await updateComment(node.id, {
              position: { x: node.position.x, y: node.position.y },
            })
            // Update last update time so we don't trigger another update unnecessarily
            setLastUpdateTime(node.id, Date.now())
          } catch (error) {
            console.error('Failed to update comment position:', error)
          }
        }
      }
    },
    [
      concepts,
      comments,
      currentMapId,
      updateConcept,
      updateComment,
      setTextViewPosition,
      screenToFlowPosition,
      setCursor,
      hasWriteAccess,
      setLastUpdateTime,
    ]
  )

  /**
   * Handle node click - let ConceptNode handle clicks (to distinguish single vs double-click).
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      // ConceptNode handles its own clicks to distinguish single vs double-click
      // This handler is kept for selection tracking but ConceptNode opens editor
    },
    []
  )

  return {
    onNodesChange,
    onNodeDrag,
    onNodeDragStop,
    onNodeClick,
  }
}

