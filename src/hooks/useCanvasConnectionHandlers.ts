/**
 * Hook for handling connection-related events in the concept map canvas.
 * 
 * Provides handlers for:
 * - Connection start (tracking source node for drag-to-create)
 * - Connection end (creating concepts when dropped on empty space)
 * - Connection (creating relationships when connecting to existing nodes)
 * 
 * This hook centralizes all connection interaction logic, making it easier to test
 * and maintain.
 */

import { useCallback } from 'react'
import type { Node, Connection, OnConnectStart } from 'reactflow'
import { useCanvasCommands } from './useCanvasCommands'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import { useMapPermissions } from './useMapPermissions'

/**
 * Options for connection handlers hook.
 */
export interface UseCanvasConnectionHandlersOptions {
  /** Array of React Flow nodes */
  nodes: Node[]
  /** Function to convert screen coordinates to flow coordinates */
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number }
}

/**
 * Hook for connection event handlers.
 * 
 * @param options - Configuration options
 * @returns Object containing connection event handlers
 */
export function useCanvasConnectionHandlers(options: UseCanvasConnectionHandlersOptions) {
  const {
    nodes,
    screenToFlowPosition,
  } = options

  const {
    createRelationship,
    createConcept,
    linkCommentToConcept,
  } = useCanvasCommands()

  const {
    connectionStart,
    setConnectionStart,
    connectionMade,
    setConnectionMade,
    setPendingConcept,
  } = useCanvasStore()

  const currentMapId = useMapStore((state) => state.currentMapId)
  const { hasWriteAccess } = useMapPermissions()

  /**
   * Handle connection start - track source node for drag-to-create.
   */
  const onConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      const nodeId = params.nodeId
      if (!nodeId) {
        return
      }

      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        setConnectionStart({
          sourceId: nodeId,
          position: node.position,
        })
      }
    },
    [nodes, setConnectionStart]
  )

  /**
   * Handle connection end - create concept if dropped on empty space.
   */
  const onConnectEnd = useCallback(
    async (event: MouseEvent | TouchEvent) => {
      // Reset connection made flag for next connection
      const wasConnectionMade = connectionMade
      setConnectionMade(false)
      
      if (!currentMapId || !connectionStart) {
        setConnectionStart(null)
        return
      }

      // Check if source is a comment node - comments don't create new concepts
      const sourceNode = nodes.find((n) => n.id === connectionStart.sourceId)
      const isCommentSource = sourceNode?.type === 'comment'

      // If a connection was made to an existing node, don't create a new node
      if (wasConnectionMade) {
        setConnectionStart(null)
        return
      }

      // Check if connection ended on a node (anywhere on the node, not just the handle)
      const target = event.target as HTMLElement
      const targetNodeElement = target.closest('.react-flow__node')
      
      // If we hit a node, create relationship or link comment
      if (targetNodeElement) {
        // Get the node ID from the id attribute (React Flow format: react-flow__node-{nodeId})
        let targetId: string | null = null
        
        // Try to extract from id attribute
        const nodeIdAttr = targetNodeElement.id
        if (nodeIdAttr && nodeIdAttr.startsWith('react-flow__node-')) {
          targetId = nodeIdAttr.replace('react-flow__node-', '')
        }
        
        // Fallback: try data-id attribute
        if (!targetId) {
          targetId = targetNodeElement.getAttribute('data-id')
        }
        
        // Fallback: use getNodes() and find node at position
        if (!targetId) {
          const pointer = 'clientX' in event ? event : event.touches?.[0]
          if (pointer) {
            const mousePosition = screenToFlowPosition({
              x: pointer.clientX,
              y: pointer.clientY,
            })
            
            // Find the node that contains this position
            const nodeAtPosition = nodes.find((node) => {
              // Rough check: see if mouse is within node bounds
              const nodeWidth = 130
              const nodeHeight = 50
              return (
                mousePosition.x >= node.position.x &&
                mousePosition.x <= node.position.x + nodeWidth &&
                mousePosition.y >= node.position.y &&
                mousePosition.y <= node.position.y + nodeHeight
              )
            })
            
            if (nodeAtPosition) {
              targetId = nodeAtPosition.id
            }
          }
        }
        
        if (targetId && targetId !== connectionStart.sourceId && targetId !== 'text-view-node') {
          try {
            if (isCommentSource) {
              // Link comment to concept
              await linkCommentToConcept(connectionStart.sourceId, targetId)
            } else {
              // Create relationship between concepts
              await createRelationship({
                mapId: currentMapId,
                fromConceptId: connectionStart.sourceId,
                toConceptId: targetId,
                primaryLabel: 'related to',
                reverseLabel: 'related from',
              })
            }
          } catch (error) {
            console.error('Failed to create connection from drag:', error)
          }
        }
        
        setConnectionStart(null)
        return
      }
      
      // Check if we hit a handle (this should have been handled by onConnect, but just in case)
      const targetHandle = target.closest('.react-flow__handle')
      if (targetHandle) {
        setConnectionStart(null)
        return
      }

      // Connection ended on empty space - only create new concept if source is a concept node
      if (isCommentSource) {
        // Comments don't create new concepts when dragged to empty space
        setConnectionStart(null)
        return
      }

      // Connection ended on empty space - create new concept and relationship
      const pointer = 'clientX' in event ? event : event.touches?.[0]
      if (!pointer) {
        setConnectionStart(null)
        return
      }

      const mousePosition = screenToFlowPosition({
        x: pointer.clientX,
        y: pointer.clientY,
      })

      // Estimate node dimensions to center it on the mouse position
      // Node has min-w-[120px], px-4 (16px padding), py-3 (12px padding)
      // For "New Concept" text, estimate ~130px width and ~50px height
      const estimatedNodeWidth = 130
      const estimatedNodeHeight = 50
      
      // Adjust position so node center is at mouse position
      const position = {
        x: mousePosition.x - estimatedNodeWidth / 2,
        y: mousePosition.y - estimatedNodeHeight / 2,
      }

      try {
        // Set pending concept to track creation
        setPendingConcept({
          sourceId: connectionStart.sourceId,
          position,
        })

        // Create the new concept using mutation hook (handles undo tracking)
        await createConcept({
          mapId: currentMapId,
          label: 'New Concept',
          position,
          notes: '',
          metadata: {},
        })

        // The relationship will be created automatically when the concept appears
        // (handled by useEffect watching pendingConcept)
      } catch (error) {
        console.error('Failed to create concept from connection:', error)
        setPendingConcept(null)
      }
      
      setConnectionStart(null)
    },
    [
      connectionMade,
      setConnectionMade,
      currentMapId,
      connectionStart,
      setConnectionStart,
      nodes,
      screenToFlowPosition,
      createRelationship,
      createConcept,
      linkCommentToConcept,
      setPendingConcept,
    ]
  )

  /**
   * Handle connection creation - create new relationship between existing nodes.
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!currentMapId || !hasWriteAccess || !connection.source || !connection.target) {
        return
      }

      // Mark that a connection was made to an existing node
      setConnectionMade(true)
      setConnectionStart(null)

      void (async () => {
        try {
          // Check if source is a comment node
          const sourceNode = nodes.find((n) => n.id === connection.source)
          const isCommentSource = sourceNode?.type === 'comment'

          if (isCommentSource) {
            // Link comment to concept
            await linkCommentToConcept(connection.source!, connection.target!)
          } else {
            // Create relationship between concepts
            await createRelationship({
              mapId: currentMapId,
              fromConceptId: connection.source!,
              toConceptId: connection.target!,
              primaryLabel: 'related to',
              reverseLabel: 'related from',
            })
          }
        } catch (error) {
          console.error('Failed to create connection:', error)
        }
      })()
    },
    [
      currentMapId,
      hasWriteAccess,
      createRelationship,
      linkCommentToConcept,
      nodes,
      setConnectionMade,
      setConnectionStart,
    ]
  )

  return {
    onConnectStart,
    onConnectEnd,
    onConnect,
  }
}

