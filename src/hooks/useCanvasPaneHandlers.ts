/**
 * Hook for handling pane-related events in the concept map canvas.
 * 
 * Provides handlers for:
 * - Pane click (deselect items)
 * - Pane double-click (create concept)
 * - Pane right-click (show context menu)
 * - Context menu actions (add concept, add comment)
 * 
 * This hook centralizes all pane interaction logic, making it easier to test
 * and maintain.
 */

import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useCanvasMutations } from './useCanvasMutations'
import { useUIStore } from '@/stores/uiStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import { useMapPermissions } from './useMapPermissions'
import type { Node } from 'reactflow'

/**
 * Options for pane handlers hook.
 */
export interface UseCanvasPaneHandlersOptions {
  /** Ref to the React Flow wrapper div */
  reactFlowWrapperRef: RefObject<HTMLDivElement | null>
  /** Function to convert screen coordinates to flow coordinates */
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number }
  /** Function to get all nodes (from React Flow) */
  getNodes: () => Node[]
  /** Function to set nodes (from React Flow) */
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
}

/**
 * Hook for pane event handlers.
 * 
 * @param options - Configuration options
 * @returns Object containing pane event handlers and context menu handlers
 */
export function useCanvasPaneHandlers(options: UseCanvasPaneHandlersOptions) {
  const {
    reactFlowWrapperRef,
    screenToFlowPosition,
    getNodes,
    setNodes,
  } = options

  const {
    createConcept,
    createComment,
  } = useCanvasMutations()

  const {
    setSelectedConceptId,
    setSelectedRelationshipId,
    setSelectedCommentId,
    setConceptEditorOpen,
    setRelationshipEditorOpen,
  } = useUIStore()

  const {
    setContextMenuVisible,
    setContextMenuPosition,
    contextMenuPosition: contextMenuPositionFromStore,
  } = useCanvasStore()

  const currentMapId = useMapStore((state) => state.currentMapId)
  const { hasWriteAccess } = useMapPermissions()

  // Ref to store context menu position for cleanup
  const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(null)

  /**
   * Handle pane click - deselect and close context menu and toolbar.
   */
  const onPaneClick = useCallback(() => {
    setSelectedConceptId(null)
    setSelectedRelationshipId(null)
    setSelectedCommentId(null)
    setConceptEditorOpen(false)
    setRelationshipEditorOpen(false)
    setContextMenuVisible(false)
    setContextMenuPosition(null)
    contextMenuPositionRef.current = null
  }, [
    setSelectedConceptId,
    setSelectedRelationshipId,
    setSelectedCommentId,
    setConceptEditorOpen,
    setRelationshipEditorOpen,
    setContextMenuVisible,
    setContextMenuPosition,
  ])

  /**
   * Helper function to create a concept at a position.
   */
  const handleCreateConceptAtPosition = useCallback(
    async (flowPosition: { x: number; y: number }) => {
      if (!currentMapId || !hasWriteAccess) return

      // Estimate node dimensions to center it on the mouse position
      const estimatedNodeWidth = 130
      const estimatedNodeHeight = 50
      
      // Adjust position so node center is at mouse position
      const position = {
        x: flowPosition.x - estimatedNodeWidth / 2,
        y: flowPosition.y - estimatedNodeHeight / 2,
      }

      try {
        // Create the new concept using mutation hook (handles undo tracking)
        await createConcept({
          mapId: currentMapId,
          label: 'New Concept',
          position,
          notes: '',
          metadata: {},
        })
        
        // Track the concept to start in edit mode
        // Find the newly created concept by matching position and label
        setTimeout(() => {
          const allNodes = getNodes()
          const newNode = allNodes.find((node) => 
            node.type === 'concept' &&
            node.data?.label === 'New Concept' &&
            Math.abs(node.position.x - position.x) < 1 &&
            Math.abs(node.position.y - position.y) < 1
          )
          if (newNode) {
            const updatedNodes = allNodes.map((node) => {
              if (node.id === newNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    shouldStartEditing: true,
                  },
                }
              }
              return node
            })
            setNodes(updatedNodes)
          }
        }, 100)
      } catch (error) {
        console.error('Failed to create concept:', error)
      }
    },
    [currentMapId, hasWriteAccess, getNodes, setNodes, createConcept]
  )

  /**
   * Helper function to create a comment at a position.
   */
  const handleCreateCommentAtPosition = useCallback(
    async (flowPosition: { x: number; y: number }) => {
      if (!currentMapId || !hasWriteAccess) return

      // Estimate comment dimensions to center it on the mouse position
      const estimatedCommentWidth = 150
      const estimatedCommentHeight = 60
      
      // Adjust position so comment center is at mouse position
      const position = {
        x: flowPosition.x - estimatedCommentWidth / 2,
        y: flowPosition.y - estimatedCommentHeight / 2,
      }

      try {
        await createComment({
          mapId: currentMapId,
          text: 'New Comment',
          position,
        })
        
        // Track the comment to start in edit mode
        setTimeout(() => {
          const allNodes = getNodes()
          // Find the most recently created comment (by checking if it has "New Comment" text)
          const commentNodes = allNodes.filter((node) => node.type === 'comment')
          const newCommentNode = commentNodes.find((node) => {
            const commentData = node.data as any
            return commentData?.comment?.text === 'New Comment'
          })
          
          if (newCommentNode) {
            const updatedNodes = allNodes.map((node) => {
              if (node.id === newCommentNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    shouldStartEditing: true,
                  },
                }
              }
              return node
            })
            setNodes(updatedNodes)
          }
        }, 100)
      } catch (error) {
        console.error('Failed to create comment:', error)
      }
    },
    [currentMapId, hasWriteAccess, createComment, getNodes, setNodes]
  )

  /**
   * Handle context menu item clicks - add concept.
   */
  const handleContextMenuAddConcept = useCallback(() => {
    if (!contextMenuPositionFromStore) return
    
    // Convert screen position to flow position
    const flowPosition = screenToFlowPosition({
      x: contextMenuPositionFromStore.x,
      y: contextMenuPositionFromStore.y,
    })
    
    handleCreateConceptAtPosition(flowPosition)
  }, [screenToFlowPosition, handleCreateConceptAtPosition, contextMenuPositionFromStore])

  /**
   * Handle context menu item clicks - add comment.
   */
  const handleContextMenuAddComment = useCallback(() => {
    if (!contextMenuPositionFromStore) return
    
    // Convert screen position to flow position
    const flowPosition = screenToFlowPosition({
      x: contextMenuPositionFromStore.x,
      y: contextMenuPositionFromStore.y,
    })
    
    handleCreateCommentAtPosition(flowPosition)
  }, [screenToFlowPosition, handleCreateCommentAtPosition, contextMenuPositionFromStore])

  // Use a ref to attach double-click handler to the React Flow pane
  const handlerRef = useRef<((event: Event) => Promise<void>) | null>(null)
  
  useEffect(() => {
    // Wait a bit for React Flow to render the pane
    const timeoutId = setTimeout(() => {
      const reactFlowPane = reactFlowWrapperRef.current?.querySelector('.react-flow__pane')
      if (!reactFlowPane) {
        console.warn('React Flow pane not found for double-click handler')
        return
      }
    
      const handlePaneDoubleClick = async (event: Event) => {
        const mouseEvent = event as MouseEvent
        if (!currentMapId || !hasWriteAccess) return

        // Check if clicking on the background (not on a node or edge)
        const target = mouseEvent.target as HTMLElement
        if (
          target.closest('.react-flow__node') ||
          target.closest('.react-flow__edge') ||
          target.closest('.react-flow__controls') ||
          target.closest('.react-flow__minimap')
        ) {
          return
        }

        // Get the position in flow coordinates
        const mousePosition = screenToFlowPosition({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
        })

        // Use helper function to create concept
        await handleCreateConceptAtPosition(mousePosition)
      }
      
      handlerRef.current = handlePaneDoubleClick
      reactFlowPane.addEventListener('dblclick', handlePaneDoubleClick)
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      const reactFlowPane = reactFlowWrapperRef.current?.querySelector('.react-flow__pane')
      if (reactFlowPane && handlerRef.current) {
        reactFlowPane.removeEventListener('dblclick', handlerRef.current)
        handlerRef.current = null
      }
    }
  }, [currentMapId, screenToFlowPosition, hasWriteAccess, handleCreateConceptAtPosition, reactFlowWrapperRef])

  // Use a ref to attach right-click handler to the React Flow pane
  const rightClickHandlerRef = useRef<((event: Event) => void) | null>(null)
  
  useEffect(() => {
    // Wait a bit for React Flow to render the pane
    const timeoutId = setTimeout(() => {
      const reactFlowPane = reactFlowWrapperRef.current?.querySelector('.react-flow__pane')
      if (!reactFlowPane) {
        console.warn('React Flow pane not found for right-click handler')
        return
      }
    
      const handlePaneRightClick = (event: Event) => {
        const mouseEvent = event as MouseEvent
        if (!currentMapId || !hasWriteAccess) return

        // Prevent default browser context menu
        mouseEvent.preventDefault()
        mouseEvent.stopPropagation()

        // Check if clicking on the background (not on a node or edge)
        const target = mouseEvent.target as HTMLElement
        if (
          target.closest('.react-flow__node') ||
          target.closest('.react-flow__edge') ||
          target.closest('.react-flow__controls') ||
          target.closest('.react-flow__minimap')
        ) {
          setContextMenuVisible(false)
          return
        }

        // Store position for context menu
        const screenPosition = {
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
        }
        setContextMenuPosition(screenPosition)
        contextMenuPositionRef.current = screenPosition
        setContextMenuVisible(true)
      }
      
      rightClickHandlerRef.current = handlePaneRightClick
      reactFlowPane.addEventListener('contextmenu', handlePaneRightClick)
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      const reactFlowPane = reactFlowWrapperRef.current?.querySelector('.react-flow__pane')
      if (reactFlowPane && rightClickHandlerRef.current) {
        reactFlowPane.removeEventListener('contextmenu', rightClickHandlerRef.current)
        rightClickHandlerRef.current = null
      }
    }
  }, [currentMapId, hasWriteAccess, setContextMenuVisible, setContextMenuPosition, reactFlowWrapperRef])

  return {
    onPaneClick,
    handleContextMenuAddConcept,
    handleContextMenuAddComment,
    contextMenuPositionRef,
  }
}

