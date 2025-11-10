/**
 * Concept map canvas component.
 * 
 * Main React Flow-based visualization component for displaying and interacting with concept maps.
 * Provides node/edge rendering, drag-and-drop, layout algorithms, and real-time collaboration.
 * 
 * **Features:**
 * - Real-time visualization of concepts and relationships
 * - Drag-and-drop node positioning
 * - Inline editing of concepts and relationships
 * - Layout algorithms (force-directed, hierarchical)
 * - Perspective filtering (shows only selected concepts/relationships)
 * - Real-time collaboration (presence, cursors, editing highlights)
 * - Connection creation (drag from node to node)
 * - Keyboard shortcuts (Delete, Escape)
 * - Permission-based editing (read-only for users without write access)
 * 
 * **Data Flow:**
 * - Reads concepts and relationships from InstantDB via hooks
 * - Converts domain models to React Flow nodes/edges
 * - Updates positions when nodes are dragged
 * - Creates/updates/deletes concepts and relationships via action hooks
 * 
 * **Performance Optimizations:**
 * - Memoized node/edge transformations
 * - Separate component for peer cursors (prevents re-renders)
 * - Stable nodeTypes/edgeTypes references
 * - Perspective filtering at data layer
 * 
 * **Layout Algorithms:**
 * - Force-directed: Organic, physics-based layout
 * - Hierarchical: Tree-like, top-to-bottom layout
 * - Sticky layouts: Auto-apply when new nodes are added
 * 
 * @param props - Component props
 * @param props.onCreateConcept - Optional callback when user requests to create a new concept
 * @returns The concept map canvas JSX wrapped in ReactFlowProvider
 * 
 * @example
 * ```tsx
 * import { ConceptMapCanvas } from '@/components/graph/ConceptMapCanvas'
 * 
 * function ConceptMapView() {
 *   return (
 *     <ConceptMapCanvas
 *       onCreateConcept={(position) => {
 *         console.log('Create concept at', position)
 *       }}
 *     />
 *   )
 * }
 * ```
 */

import React, { useCallback, useMemo, useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type OnConnectStart,
  type NodeChange,
  type EdgeChange,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { conceptsToNodes, relationshipsToEdges, commentsToNodes, commentsToEdges } from '@/lib/data'
import { useConcepts, useAllConcepts } from '@/hooks/useConcepts'
import { useRelationships, useAllRelationships } from '@/hooks/useRelationships'
import { useComments } from '@/hooks/useComments'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useCommentActions } from '@/hooks/useCommentActions'
import { useUndo } from '@/hooks/useUndo'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { db, tx, id } from '@/lib/instant'
import { nodeTypes, edgeTypes } from './reactFlowTypes'
import type { LayoutType } from '@/lib/layouts'
import { applyForceDirectedLayout, applyHierarchicalLayout, applyCircularLayout, applyLayeredLayout, applyStressLayout } from '@/lib/layouts'
import { FileText } from 'lucide-react'
import { usePresenceEditing } from '@/hooks/usePresenceEditing'
import { usePresenceCursorSetter } from '@/hooks/usePresenceCursorSetter'
import { PeerCursors } from '@/components/presence/PeerCursors'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { LayoutSelector } from './LayoutSelector'
import { CustomConnectionLine } from './CustomConnectionLine'
import { CanvasContextMenu } from './CanvasContextMenu'

/**
 * Props for ConceptMapCanvas component.
 */
export interface ConceptMapCanvasProps {
  /** Callback when user requests to create a new concept at a position */
  onCreateConcept?: (position: { x: number; y: number }) => void
}

/**
 * Ref interface for ConceptMapCanvas component.
 * Provides imperative API for layout operations.
 */
export interface ConceptMapCanvasRef {
  /** Apply a layout algorithm to the current nodes */
  applyLayout: (layoutType: LayoutType) => Promise<void>
}

/**
 * Inner component that uses ReactFlow hooks.
 * Must be wrapped in ReactFlowProvider to access ReactFlow context.
 * 
 * @param props - Component props
 * @param ref - Forwarded ref for imperative API
 * @returns The concept map canvas JSX
 */
const ConceptMapCanvasInner = forwardRef<ConceptMapCanvasRef, ConceptMapCanvasProps>(
  (_props, ref) => {
  // Use refs to ensure nodeTypes and edgeTypes have stable references
  // This prevents React Flow from detecting them as new objects on each render
  const nodeTypesRef = useRef(nodeTypes)
  const edgeTypesRef = useRef(edgeTypes)
  
  // Track relationship IDs connected to newly created concepts (for edit mode)
  // When a new concept is created, the relationship enters edit mode first
  const newlyCreatedRelationshipIdsRef = useRef<Map<string, string>>(new Map()) // conceptId -> relationshipId
  
  // Track active layout for sticky behavior - auto-apply when nodes are added
  const [activeLayout, setActiveLayout] = useState<LayoutType | null>(null)
  // Track selected layout (shown on main button)
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('force-directed')
  
  // Track if we've checked for initial concept creation (to avoid creating multiple)
  const hasCheckedInitialConceptRef = useRef<Set<string>>(new Set())
  // Track which nodes have been laid out (for incremental layout)
  const laidOutNodeIdsRef = useRef<Set<string>>(new Set())
  // Track if we're currently centering on a concept (to prevent timeout cleanup)
  const isCenteringRef = useRef(false)
  
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = useMapStore((state) => state.isEditingPerspective)
  
  // Reset laid-out nodes when switching maps
  useEffect(() => {
    laidOutNodeIdsRef.current.clear()
    isCenteringRef.current = false // Reset centering flag when switching maps
  }, [currentMapId])
  
  // Check if user has write access to the current map
  const { hasWriteAccess } = useMapPermissions()
  
  // Get perspectives to check which concepts are included
  const perspectives = usePerspectives()
  const currentPerspective = currentPerspectiveId
    ? perspectives.find((p) => p.id === currentPerspectiveId)
    : null
  // Memoize perspectiveConceptIds to ensure stable reference when contents don't change
  const perspectiveConceptIds = useMemo(() => {
    return currentPerspective
      ? new Set(currentPerspective.conceptIds)
      : undefined
  }, [currentPerspective ? [...currentPerspective.conceptIds].sort().join(',') : undefined])
  
  // Memoize perspectiveRelationshipIds to ensure stable reference when contents don't change
  const perspectiveRelationshipIds = useMemo(() => {
    return currentPerspective
      ? new Set(currentPerspective.relationshipIds)
      : undefined
  }, [currentPerspective ? [...currentPerspective.relationshipIds].sort().join(',') : undefined])
  
  // Use all concepts/relationships when editing perspective, filtered otherwise
  const filteredConcepts = useConcepts()
  const filteredRelationships = useRelationships()
  const allConcepts = useAllConcepts()
  const allRelationships = useAllRelationships()
  const comments = useComments() // Comments are already filtered by perspective in the hook
  
  const concepts = isEditingPerspective ? allConcepts : filteredConcepts
  const relationships = isEditingPerspective ? allRelationships : filteredRelationships
  const { updateConcept, deleteConcept, createConcept } = useConceptActions()
  const { createRelationship, deleteRelationship } = useRelationshipActions()
  const { deleteComment, updateComment, createComment, linkCommentToConcept, unlinkCommentFromConcept } = useCommentActions()
  const { recordDeletion, startOperation, endOperation } = useUndo()
  const { 
    setSelectedConceptId, 
    setSelectedRelationshipId, 
    setConceptEditorOpen, 
    setRelationshipEditorOpen,
    textViewVisible,
    setTextViewVisible,
    textViewPosition,
    setTextViewPosition,
  } = useUIStore()
  const { screenToFlowPosition, fitView, getNode, setCenter, getViewport } = useReactFlow()
  
  // Presence tracking - split into separate hooks to prevent unnecessary re-renders
  // Cursor setter: only updates cursor position, doesn't subscribe to peer cursors
  const { setCursor } = usePresenceCursorSetter()
  // Editing hook: updates only when editing state changes
  const { setEditingNode, setEditingEdge } = usePresenceEditing()
  
  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)
  const currentConceptId = useMapStore((state) => state.currentConceptId)
  const shouldAutoCenterConcept = useMapStore((state) => state.shouldAutoCenterConcept)
  const setCurrentConceptId = useMapStore((state) => state.setCurrentConceptId)
  const setShouldAutoCenterConcept = useMapStore((state) => state.setShouldAutoCenterConcept)
  
  // Track cursor movement on the React Flow pane
  // Convert screen coordinates to flow coordinates for storage
  useEffect(() => {
    const reactFlowPane = document.querySelector<HTMLElement>('.react-flow')
    if (!reactFlowPane) return
    
    const handleMouseMove = (event: MouseEvent) => {
      // Get the React Flow pane bounds
      const paneRect = reactFlowPane.getBoundingClientRect()
      
      // Check if mouse is within the pane
      if (
        event.clientX >= paneRect.left &&
        event.clientX <= paneRect.right &&
        event.clientY >= paneRect.top &&
        event.clientY <= paneRect.bottom
      ) {
        // Convert screen coordinates to flow coordinates
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        setCursor(flowPosition)
      } else {
        // Mouse outside pane - clear cursor
        setCursor(null)
      }
    }
    
    const handleMouseLeave = () => {
      setCursor(null)
    }
    
    reactFlowPane.addEventListener('mousemove', handleMouseMove)
    reactFlowPane.addEventListener('mouseleave', handleMouseLeave)
    
    return () => {
      reactFlowPane.removeEventListener('mousemove', handleMouseMove)
      reactFlowPane.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [setCursor, screenToFlowPosition])
  
  // Track editing state
  useEffect(() => {
    setEditingNode(selectedConceptId)
  }, [selectedConceptId, setEditingNode])
  
  useEffect(() => {
    setEditingEdge(selectedRelationshipId)
  }, [selectedRelationshipId, setEditingEdge])

  const [connectionStart, setConnectionStart] = useState<{
    sourceId: string
    position: { x: number; y: number }
  } | null>(null)

  // Track pending concept creation for relationship creation
  const pendingConceptRef = useRef<{
    sourceId: string
    position: { x: number; y: number }
  } | null>(null)

  // Convert InstantDB data to React Flow format
  const newNodes = useMemo(
    () =>
      conceptsToNodes(
        concepts,
        perspectiveConceptIds,
        isEditingPerspective
      ),
    [concepts, perspectiveConceptIds, isEditingPerspective]
  )
  const newEdges = useMemo(
    () =>
      relationshipsToEdges(
        relationships,
        perspectiveRelationshipIds,
        isEditingPerspective
      ),
    [relationships, perspectiveRelationshipIds, isEditingPerspective]
  )

  // Convert comments to nodes and edges
  const commentNodes = useMemo(
    () => commentsToNodes(comments, perspectiveConceptIds),
    [comments, perspectiveConceptIds]
  )
  const commentEdges = useMemo(
    () => commentsToEdges(comments, concepts, perspectiveConceptIds),
    [comments, concepts, perspectiveConceptIds]
  )


  // Add text view node if visible, and merge comment nodes
  const allNodes = useMemo(() => {
    const nodes = [...newNodes, ...commentNodes]
    if (textViewVisible) {
      nodes.push({
        id: 'text-view-node',
        type: 'text-view',
        position: textViewPosition,
        data: { type: 'text-view' },
        draggable: true,
        selectable: true,
      })
    }
    return nodes
  }, [newNodes, commentNodes, textViewVisible, textViewPosition])

  // Track previous data to avoid unnecessary updates
  const prevConceptsRef = useRef(concepts)
  const prevRelationshipsRef = useRef(relationships)
  const prevCommentsRef = useRef(comments)
  const prevCommentEdgesRef = useRef(commentEdges)
  const prevTextViewVisibleRef = useRef(textViewVisible)
  const prevPerspectiveConceptIdsRef = useRef<string | undefined>(perspectiveConceptIds ? Array.from(perspectiveConceptIds).sort().join(',') : undefined)
  const prevPerspectiveRelationshipIdsRef = useRef<string | undefined>(perspectiveRelationshipIds ? Array.from(perspectiveRelationshipIds).sort().join(',') : undefined)
  const prevIsEditingPerspectiveRef = useRef(isEditingPerspective)

  // React Flow state management - initialize with data
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(allNodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([...newEdges, ...commentEdges])

  // Update newly created relationship edges to start in edit mode
  // Watch for when the relationship appears in the relationships array and update the corresponding edge
  useEffect(() => {
    const relationshipIdsToUpdate = Array.from(
      newlyCreatedRelationshipIdsRef.current.values()
    )
    if (relationshipIdsToUpdate.length === 0) return
    
    // Use the same relationships array that's used to create edges
    const relationshipsForEdges = isEditingPerspective ? allRelationships : filteredRelationships
    
    // Check if any of the tracked relationships have appeared
    const relationshipsToTrigger = relationshipsForEdges.filter((r) => 
      relationshipIdsToUpdate.includes(r.id)
    )
    
    if (relationshipsToTrigger.length > 0) {
      // Wait for next frame to ensure edges are rendered
      requestAnimationFrame(() => {
        const updatedEdges = edges.map((edge) => {
          const relationshipId = relationshipsToTrigger.find((r) => r.id === edge.id)?.id
          if (relationshipId && !edge.data?.shouldStartEditing) {
            // Remove from tracking map immediately to prevent re-triggering
            // Find and remove the entry for this relationship
            for (const [conceptId, relId] of newlyCreatedRelationshipIdsRef.current.entries()) {
              if (relId === relationshipId) {
                newlyCreatedRelationshipIdsRef.current.delete(conceptId)
                break
              }
            }
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
        
        // Only update if we actually changed something
        const hasChanges = updatedEdges.some((edge, index) => edge !== edges[index])
        if (hasChanges) {
          setEdges(updatedEdges)
        }
      })
    }
  }, [filteredRelationships, allRelationships, isEditingPerspective, edges, setEdges])

  // Clear shouldStartEditing flag after it's been used (to prevent re-triggering)
  useEffect(() => {
    const nodesWithFlag = nodes.filter((node) => node.data.shouldStartEditing)
    if (nodesWithFlag.length > 0) {
      // Clear the flag after a short delay to allow edit mode to trigger
      const timeoutId = setTimeout(() => {
        const updatedNodes = nodes.map((node) => {
          if (node.data.shouldStartEditing) {
            return {
              ...node,
              data: {
                ...node.data,
                shouldStartEditing: false,
              },
            }
          }
          return node
        })
        setNodes(updatedNodes)
      }, 100) // Small delay to ensure edit mode has triggered
      
      return () => clearTimeout(timeoutId)
    }
  }, [nodes, setNodes])

  // Clear shouldStartEditing flag from edges after it's been used
  useEffect(() => {
    const edgesWithFlag = edges.filter((edge) => edge.data?.shouldStartEditing)
    if (edgesWithFlag.length > 0) {
      // Clear the flag after a short delay to allow edit mode to trigger
      const timeoutId = setTimeout(() => {
        const updatedEdges = edges.map((edge) => {
          if (edge.data?.shouldStartEditing) {
            return {
              ...edge,
              data: {
                ...edge.data,
                shouldStartEditing: false,
              },
            }
          }
          return edge
        })
        setEdges(updatedEdges)
      }, 100) // Small delay to ensure edit mode has triggered
      
      return () => clearTimeout(timeoutId)
    }
  }, [edges, setEdges])

  // Handle deep linking to concepts: select and center when concept ID is in URL
  // This must be after nodes is declared
  // Only triggers when shouldAutoCenterConcept is true (set during URL navigation)
  useEffect(() => {
    console.log('[ConceptMapCanvas] Deep link effect triggered', {
      shouldAutoCenterConcept,
      currentConceptId,
      conceptsCount: concepts.length,
      nodesCount: nodes.length,
    })
    
    // Only trigger if auto-centering is enabled and we have a concept ID
    if (!shouldAutoCenterConcept || !currentConceptId) {
      console.log('[ConceptMapCanvas] Early return: missing flag or concept ID')
      return
    }
    
    // Wait for concepts to be available (concepts are the source of truth, nodes are derived)
    if (!concepts.length) {
      console.log('[ConceptMapCanvas] Waiting for concepts to load...')
      return
    }
    
    // Check if the concept exists in the concepts array
    const conceptExists = concepts.some((c) => c.id === currentConceptId)
    console.log('[ConceptMapCanvas] Concept exists check', {
      conceptExists,
      conceptIds: concepts.map((c) => c.id),
      lookingFor: currentConceptId,
    })
    
    if (!conceptExists) {
      console.log('[ConceptMapCanvas] Concept not found in concepts array')
      return
    }
    
    // Wait for nodes to be available as well
    if (!nodes.length) {
      console.log('[ConceptMapCanvas] Waiting for nodes to be available...')
      return
    }
    
    // Find the concept node
    const conceptNode = nodes.find((node) => node.id === currentConceptId)
    if (!conceptNode) {
      console.log('[ConceptMapCanvas] Concept node not found in nodes array')
      return
    }
    
    console.log('[ConceptMapCanvas] Proceeding with auto-center', { conceptId: currentConceptId })
    
    // Check if we're already centering (prevent duplicate calls)
    if (isCenteringRef.current) {
      console.log('[ConceptMapCanvas] Already centering, skipping')
      return
    }
    
    // Mark that we're centering
    isCenteringRef.current = true
    
    // Select the concept FIRST (before clearing flag)
    setSelectedConceptId(currentConceptId)
    console.log('[ConceptMapCanvas] Selected concept', { conceptId: currentConceptId })
    
    // Also select the node in React Flow by updating its selected property
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        if (node.id === currentConceptId) {
          return { ...node, selected: true }
        }
        return { ...node, selected: false }
      })
    })
    console.log('[ConceptMapCanvas] Set node selected property in React Flow')
    
    // Disable auto-centering flag AFTER selection to prevent re-triggering
    setShouldAutoCenterConcept(false)
    
    // Center on the concept and fit view to show the whole map
    // Use setTimeout to ensure React Flow is ready
    const timeoutId = setTimeout(() => {
      console.log('[ConceptMapCanvas] Starting fitView')
      // First fit view to show the whole map (this sets the zoom level)
      fitView({ padding: 0.1, duration: 300 })
      
      // After fitView completes, get the current viewport and center on the concept
      setTimeout(() => {
        const node = getNode(currentConceptId)
        console.log('[ConceptMapCanvas] Getting node for centering', { node: node ? { id: node.id, position: node.position } : null })
        if (node) {
          // Get current viewport to preserve zoom level from fitView
          const viewport = getViewport()
          console.log('[ConceptMapCanvas] Centering on concept', { position: node.position, zoom: viewport.zoom })
          // Center on the concept node while preserving the zoom from fitView
          setCenter(node.position.x, node.position.y, { zoom: viewport.zoom, duration: 300 })
          console.log('[ConceptMapCanvas] Centered on concept', { position: node.position })
        } else {
          console.warn('[ConceptMapCanvas] Node not found when trying to center', { conceptId: currentConceptId })
        }
        // Clear currentConceptId from store after handling to prevent interference with normal selection
        setCurrentConceptId(null)
        // Reset centering flag
        isCenteringRef.current = false
        console.log('[ConceptMapCanvas] Cleared currentConceptId from store and reset centering flag')
      }, 350)
    }, 100)
    
    // Only clear timeout if we're not currently centering (prevent cleanup from canceling the operation)
    return () => {
      if (!isCenteringRef.current) {
        console.log('[ConceptMapCanvas] Cleaning up timeout')
        clearTimeout(timeoutId)
      }
    }
  }, [shouldAutoCenterConcept, currentConceptId, concepts, nodes, setSelectedConceptId, setNodes, fitView, getNode, setCenter, getViewport, setCurrentConceptId, setShouldAutoCenterConcept])

  // Wrap onNodesChange to intercept deletions and delete from database
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
              recordDeletion('relationship', rel.id)
              return deleteRelationship(rel.id)
            })
            
            // Delete concepts
            const conceptDeletePromises = removeChanges.map((change) => {
              if (change.type === 'remove' && change.id) {
                // Only delete if it's a concept node (not text-view node)
                const node = nodes.find((n) => n.id === change.id)
                if (node && node.type === 'concept') {
                  // Record deletion for undo
                  recordDeletion('concept', change.id)
                  return deleteConcept(change.id)
                } else if (node && node.type === 'comment') {
                  // Record deletion for undo
                  recordDeletion('comment', change.id)
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
    [hasWriteAccess, currentMapId, deleteConcept, deleteRelationship, deleteComment, nodes, relationships, onNodesChangeBase, selectedConceptId, setSelectedConceptId, setConceptEditorOpen, recordDeletion, startOperation, endOperation]
  )

  // Wrap onEdgesChange to intercept deletions and delete from database
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Filter out remove actions and delete from database
      const removeChanges = changes.filter((change) => change.type === 'remove')

      // If user doesn't have write access, prevent deletions by filtering out remove changes
      if (removeChanges.length > 0 && !hasWriteAccess) {
        // Filter out remove changes before calling base handler
        const filteredChanges = changes.filter((change) => change.type !== 'remove')
        onEdgesChangeBase(filteredChanges)
        return
      }

      if (removeChanges.length > 0 && hasWriteAccess && currentMapId) {
        // Check if selected relationship is being deleted
        const deletedRelationshipIds = removeChanges
          .map((change) => change.type === 'remove' ? change.id : undefined)
          .filter((id): id is string => id !== undefined)
        
        if (selectedRelationshipId && deletedRelationshipIds.includes(selectedRelationshipId)) {
          setSelectedRelationshipId(null)
          setRelationshipEditorOpen(false)
        }

        // Separate comment edges from relationship edges
        const currentEdges = edges
        const commentEdgeIds = new Set(
          currentEdges.filter((e) => e.type === 'comment-edge').map((e) => e.id)
        )

        // Delete relationships and unlink comments from database
        void (async () => {
          try {
            // Start a deletion operation
            startOperation()
            
            const deletePromises = removeChanges.map((change) => {
              if (change.type === 'remove' && change.id) {
                const isCommentEdge = commentEdgeIds.has(change.id)
                
                if (isCommentEdge) {
                  // Find the edge to get source (comment) and target (concept)
                  const edge = currentEdges.find((e) => e.id === change.id)
                  if (edge && edge.source && edge.target) {
                    // Unlink comment from concept
                    return unlinkCommentFromConcept(edge.source, edge.target)
                  }
                } else {
                  // Record deletion for undo and delete relationship
                  recordDeletion('relationship', change.id)
                  return deleteRelationship(change.id)
                }
              }
              return Promise.resolve()
            })
            await Promise.all(deletePromises)
            
            // End the deletion operation
            endOperation()
          } catch (error) {
            console.error('Failed to delete edges:', error)
            alert('Failed to delete edges. Please try again.')
            // End operation even on error
            endOperation()
          }
        })()
      }

      // Always call the base handler to update React Flow state
      onEdgesChangeBase(changes)
    },
    [hasWriteAccess, currentMapId, deleteRelationship, unlinkCommentFromConcept, onEdgesChangeBase, selectedRelationshipId, setSelectedRelationshipId, setRelationshipEditorOpen, recordDeletion, startOperation, endOperation, edges]
  )

  // Expose layout handler via ref (must be after nodes/edges are initialized)
  useImperativeHandle(ref, () => ({
    applyLayout: async (layoutType: LayoutType) => {
      if (!currentMapId) return
      
      // Use getNodes/getEdges to get the latest state
      const currentNodes = getNodes()
      const currentEdges = getEdges()
      
      const conceptNodesArray = currentNodes.filter(n => n.type === 'concept')
      if (conceptNodesArray.length === 0) return

      let layoutNodes: Node[]
      
      if (layoutType === 'force-directed') {
        layoutNodes = applyForceDirectedLayout(conceptNodesArray, currentEdges, {
          width: 2000,
          height: 2000,
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

      // Batch update all concept positions in InstantDB
      try {
        const updates = layoutNodes.map((node) =>
          tx.concepts[node.id].update({
            positionX: node.position.x,
            positionY: node.position.y,
            updatedAt: Date.now(),
          })
        )
        await db.transact(updates)
        
        // Mark all nodes as laid out (full layout via ref)
        laidOutNodeIdsRef.current = new Set(conceptNodesArray.map(n => n.id))
        
        // Fit view to show all nodes after layout
        setTimeout(() => {
          fitView({ padding: 0.1 })
        }, 100)
      } catch (error) {
        console.error('Failed to apply layout:', error)
        alert('Failed to apply layout. Please try again.')
      }
    },
  }), [nodes, edges, currentMapId, fitView])

  // Get React Flow instance for accessing latest nodes/edges
  const { getNodes, getEdges } = useReactFlow()
  
  // Create initial concept if map is empty (new map)
  useEffect(() => {
    if (!currentMapId || !hasWriteAccess) return
    
    // Check if we've already handled this map
    if (hasCheckedInitialConceptRef.current.has(currentMapId)) return
    
    // Check if map has no concepts
    if (concepts.length === 0) {
      hasCheckedInitialConceptRef.current.add(currentMapId)
      
      // Create initial concept at center of viewport (0, 0 in flow coordinates)
      const initialPosition = {
        x: 0,
        y: 0,
      }
      
      // Estimate node dimensions to center it
      const estimatedNodeWidth = 130
      const estimatedNodeHeight = 50
      
      // Adjust position so node center is at origin
      const position = {
        x: initialPosition.x - estimatedNodeWidth / 2,
        y: initialPosition.y - estimatedNodeHeight / 2,
      }
      
      const createInitialConcept = async () => {
        try {
          // Generate ID for the new concept
          const newConceptId = id()

          // Create the new concept
          await db.transact([
            tx.concepts[newConceptId]
              .update({
                label: 'New Concept',
                positionX: position.x,
                positionY: position.y,
                notes: '',
                metadata: JSON.stringify({}),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })
              .link({ map: currentMapId }),
          ])
          
          // Track the concept to start in edit mode
          // Wait a bit for the node to appear, then set shouldStartEditing flag
          setTimeout(() => {
            const allNodes = getNodes()
            const newNode = allNodes.find((node) => node.id === newConceptId)
            if (newNode) {
              const updatedNodes = allNodes.map((node) => {
                if (node.id === newConceptId) {
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
          }, 200)
        } catch (error) {
          console.error('Failed to create initial concept:', error)
        }
      }
      
      // Small delay to ensure React Flow is ready
      setTimeout(createInitialConcept, 300)
    } else {
      // Map has concepts, mark as checked
      hasCheckedInitialConceptRef.current.add(currentMapId)
    }
  }, [currentMapId, concepts.length, hasWriteAccess, getNodes, setNodes])
  
  // Layout handler function for buttons
  const handleApplyLayout = useCallback(
    async (layoutType: LayoutType, makeSticky: boolean = false, incremental: boolean = false) => {
      if (!currentMapId) return
      
      // Use getNodes/getEdges to get the latest state (important for auto-apply)
      const currentNodes = getNodes()
      const currentEdges = getEdges()
      
      const conceptNodesArray = currentNodes.filter(n => n.type === 'concept')
      if (conceptNodesArray.length === 0) return

      // For incremental layout, identify new nodes
      const newConceptIds = incremental 
        ? new Set(conceptNodesArray.filter(n => !laidOutNodeIdsRef.current.has(n.id)).map(n => n.id))
        : undefined
      const fixedNodeIds = incremental && laidOutNodeIdsRef.current.size > 0
        ? laidOutNodeIdsRef.current
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
          newConceptIds.forEach(id => laidOutNodeIdsRef.current.add(id))
        } else {
          // Full layout - mark all nodes as laid out
          laidOutNodeIdsRef.current = new Set(conceptNodesArray.map(n => n.id))
        }
        
        // Fit view to show all nodes after layout (only for full layouts)
        if (!incremental) {
          setTimeout(() => {
            fitView({ padding: 0.1 })
          }, 100)
        }
      } catch (error) {
        console.error('Failed to apply layout:', error)
        alert('Failed to apply layout. Please try again.')
      }
    },
    [currentMapId, getNodes, getEdges, fitView, setSelectedLayout]
  )
  
  // Track previous concept IDs to detect new nodes (more reliable than count)
  const prevConceptIdsRef = useRef<Set<string>>(new Set())
  
  // Initialize ref on first render
  useEffect(() => {
    if (prevConceptIdsRef.current.size === 0) {
      prevConceptIdsRef.current = new Set(concepts.map(c => c.id))
    }
  }, [])
  
  // Create a stable string representation of concept IDs for dependency tracking
  const conceptIdsString = useMemo(
    () => concepts.map(c => c.id).sort().join(','),
    [concepts]
  )
  
  // Auto-apply active layout when new nodes are added
  useEffect(() => {
    if (!activeLayout) {
      // Update ref even if no active layout
      prevConceptIdsRef.current = new Set(concepts.map(c => c.id))
      return
    }
    
    const currentConceptIds = new Set(concepts.map(c => c.id))
    const previousConceptIds = prevConceptIdsRef.current
    
    // Check if any new concepts were added (not just count change)
    const newConceptIds = Array.from(currentConceptIds).filter(id => !previousConceptIds.has(id))
    
    // If new nodes were added and we have an active layout, re-apply it
    if (newConceptIds.length > 0 && concepts.length > 0) {
      // Small delay to ensure the new node is fully created and edges are updated
      const timeoutId = setTimeout(() => {
        // Use incremental layout for force-directed, full layout for others
        const useIncremental = activeLayout === 'force-directed' && laidOutNodeIdsRef.current.size > 0
        handleApplyLayout(activeLayout, true, useIncremental).catch((error) => {
          console.error('Failed to auto-apply layout:', error)
        })
      }, 300)
      
      // Update ref for next comparison
      prevConceptIdsRef.current = currentConceptIds
      
      return () => clearTimeout(timeoutId)
    }
    
    // Update ref even if no new nodes (in case nodes were deleted)
    prevConceptIdsRef.current = currentConceptIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptIdsString, activeLayout, handleApplyLayout])
  
  // Memoize concept nodes to avoid recreating the filter on every render
  const conceptNodes = useMemo(() => nodes.filter(n => n.type === 'concept'), [nodes])

  // Sync InstantDB data changes to React Flow only when data actually changes
  useEffect(() => {
    // Only update if concepts actually changed (by ID, position, label, notes, or metadata)
    const conceptsChanged = 
      concepts.length !== prevConceptsRef.current.length ||
      concepts.some((c, i) => {
        const prev = prevConceptsRef.current[i]
        if (!prev) return true
        if (c.id !== prev.id) return true
        if (c.position.x !== prev.position.x) return true
        if (c.position.y !== prev.position.y) return true
        if (c.label !== prev.label) return true
        // Check if notes changed
        if ((c.notes || '') !== (prev.notes || '')) return true
        // Check if metadata changed (compare JSON strings)
        const metadataChanged = JSON.stringify(c.metadata || {}) !== JSON.stringify(prev.metadata || {})
        return metadataChanged
      })

    // Check if comments changed
    const commentsChanged = 
      comments.length !== prevCommentsRef.current.length ||
      comments.some((c, i) => {
        const prev = prevCommentsRef.current[i]
        if (!prev) return true
        if (c.id !== prev.id) return true
        if (c.position.x !== prev.position.x) return true
        if (c.position.y !== prev.position.y) return true
        if (c.text !== prev.text) return true
        return false
      })

    // Check if perspective inclusion state changed
    const currentPerspectiveKey = perspectiveConceptIds ? Array.from(perspectiveConceptIds).sort().join(',') : undefined
    const perspectiveChanged = 
      currentPerspectiveKey !== prevPerspectiveConceptIdsRef.current ||
      isEditingPerspective !== prevIsEditingPerspectiveRef.current

    if (conceptsChanged || commentsChanged || perspectiveChanged || textViewVisible !== prevTextViewVisibleRef.current) {
      setNodes(allNodes)
      prevConceptsRef.current = concepts
      prevCommentsRef.current = comments
      prevTextViewVisibleRef.current = textViewVisible
      prevPerspectiveConceptIdsRef.current = currentPerspectiveKey
      prevIsEditingPerspectiveRef.current = isEditingPerspective
    }
  }, [allNodes, concepts, comments, textViewVisible, perspectiveConceptIds, isEditingPerspective, setNodes])

  useEffect(() => {
    // Only update if relationships actually changed
    const relationshipsChanged = 
      relationships.length !== prevRelationshipsRef.current.length ||
      relationships.some((r, i) => {
        const prev = prevRelationshipsRef.current[i]
        if (!prev) return true
        if (r.id !== prev.id) return true
        if (r.fromConceptId !== prev.fromConceptId) return true
        if (r.toConceptId !== prev.toConceptId) return true
        if (r.primaryLabel !== prev.primaryLabel) return true
        if (r.reverseLabel !== prev.reverseLabel) return true
        // Check if metadata changed (compare JSON strings)
        const metadataChanged = JSON.stringify(r.metadata || {}) !== JSON.stringify(prev.metadata || {})
        return metadataChanged
      })

    // Check if perspective inclusion state changed for relationships
    const currentPerspectiveRelationshipKey = perspectiveRelationshipIds ? Array.from(perspectiveRelationshipIds).sort().join(',') : undefined
    const perspectiveRelationshipChanged = 
      currentPerspectiveRelationshipKey !== prevPerspectiveRelationshipIdsRef.current ||
      isEditingPerspective !== prevIsEditingPerspectiveRef.current

    // Check if comment edges changed
    const commentEdgesChanged = 
      commentEdges.length !== prevCommentEdgesRef.current.length ||
      commentEdges.some((edge, i) => {
        const prev = prevCommentEdgesRef.current[i]
        if (!prev) return true
        if (edge.id !== prev.id) return true
        if (edge.source !== prev.source) return true
        if (edge.target !== prev.target) return true
        return false
      })

    if (relationshipsChanged || perspectiveRelationshipChanged || commentEdgesChanged) {
      setEdges([...newEdges, ...commentEdges])
      prevRelationshipsRef.current = relationships
      prevCommentsRef.current = comments
      prevCommentEdgesRef.current = commentEdges
      prevPerspectiveRelationshipIdsRef.current = currentPerspectiveRelationshipKey
      prevIsEditingPerspectiveRef.current = isEditingPerspective
    }
  }, [newEdges, commentEdges, relationships, comments, perspectiveRelationshipIds, isEditingPerspective, setEdges])

  // When a new concept appears, check if we need to create a relationship
  useEffect(() => {
    if (!pendingConceptRef.current || !currentMapId) return

    const { sourceId, position } = pendingConceptRef.current

    // Find the concept we just created (by position)
    const createdConcept = concepts.find(
      (c) =>
        Math.abs(c.position.x - position.x) < 50 &&
        Math.abs(c.position.y - position.y) < 50 &&
        c.label === 'New Concept'
    )

    if (createdConcept) {
      // Create the relationship
      createRelationship({
        mapId: currentMapId,
        fromConceptId: sourceId,
        toConceptId: createdConcept.id,
        primaryLabel: 'related to',
        reverseLabel: 'related from',
      }).catch((error) => {
        console.error('Failed to create relationship:', error)
      })

      // Clear pending
      pendingConceptRef.current = null
    }
  }, [concepts, currentMapId, createRelationship])

  // Handle connection start - track source node for drag-to-create
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
    [nodes]
  )

  // Handle connection end - create concept if dropped on empty space
  const onConnectEnd = useCallback(
    async (event: MouseEvent | TouchEvent) => {
      // Reset connection made flag for next connection
      const wasConnectionMade = connectionMadeRef.current
      connectionMadeRef.current = false
      
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
        // Generate IDs for both concept and relationship
        const newConceptId = id()
        const newRelationshipId = id()

        // Create both concept and relationship in a single transaction
        await db.transact([
          // Create the new concept
          tx.concepts[newConceptId]
            .update({
              label: 'New Concept',
              positionX: position.x,
              positionY: position.y,
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({ map: currentMapId }),
          // Create the relationship linking source to new concept
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
              fromConcept: connectionStart.sourceId,
              toConcept: newConceptId,
            }),
        ])
        
        // Track the relationship to start in edit mode (not the node)
        // The relationship will be edited first, then Tab/Enter will move to the node
        newlyCreatedRelationshipIdsRef.current.set(newConceptId, newRelationshipId)
      } catch (error) {
        console.error('Failed to create concept and relationship from connection:', error)
      }

      setConnectionStart(null)
    },
    [
      currentMapId,
      connectionStart,
      screenToFlowPosition,
      createRelationship,
      linkCommentToConcept,
      nodes,
    ]
  )

  // Track last update time for each node to throttle updates
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map())
  const THROTTLE_MS = 100 // Update every 100ms maximum

  // Handle node drag - update position in database with throttling
  const onNodeDrag = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!currentMapId || !hasWriteAccess) return

      // Handle text view node position update (no throttling needed for UI state)
      if (node.id === 'text-view-node') {
        setTextViewPosition(node.position)
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
      const lastUpdate = lastUpdateTimeRef.current.get(node.id) || 0
      const timeSinceLastUpdate = now - lastUpdate

      // Only update if throttle interval has passed
      if (timeSinceLastUpdate >= THROTTLE_MS) {
        lastUpdateTimeRef.current.set(node.id, now)
        
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
    [currentMapId, concepts, comments, updateConcept, updateComment, setTextViewPosition, screenToFlowPosition, setCursor, hasWriteAccess]
  )

  // Handle node drag end - ensure final position is saved
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
            lastUpdateTimeRef.current.set(node.id, Date.now())
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
            lastUpdateTimeRef.current.set(node.id, Date.now())
          } catch (error) {
            console.error('Failed to update comment position:', error)
          }
        }
      }
    },
    [concepts, comments, currentMapId, updateConcept, updateComment, setTextViewPosition, screenToFlowPosition, setCursor, hasWriteAccess]
  )

  // Handle node click - let ConceptNode handle clicks (to distinguish single vs double-click)
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      // ConceptNode handles its own clicks to distinguish single vs double-click
      // This handler is kept for selection tracking but ConceptNode opens editor
    },
    []
  )

  // Handle edge click - select relationship and open editor
  // Note: Double-click is handled by RelationshipEdge for inline editing
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Close concept editor and clear concept selection when selecting a relationship
      setSelectedConceptId(null)
      setConceptEditorOpen(false)
      // Open relationship editor
      setSelectedRelationshipId(edge.id)
      setRelationshipEditorOpen(true)
    },
    [setSelectedConceptId, setConceptEditorOpen, setSelectedRelationshipId, setRelationshipEditorOpen]
  )

  // Handle connection creation - create new relationship between existing nodes
  // Track if a connection was successfully made to an existing node
  const connectionMadeRef = useRef(false)
  
  const onConnectHandler = useCallback(
    (connection: Connection) => {
      if (!currentMapId || !hasWriteAccess || !connection.source || !connection.target) {
        return
      }

      // Mark that a connection was made to an existing node
      connectionMadeRef.current = true
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
    [currentMapId, hasWriteAccess, createRelationship, linkCommentToConcept, nodes]
  )

  // Handle pane click - deselect and close context menu
  const onPaneClick = useCallback(() => {
    setSelectedConceptId(null)
    setSelectedRelationshipId(null)
    setConceptEditorOpen(false)
    setRelationshipEditorOpen(false)
    setContextMenuVisible(false)
    setContextMenuPosition(null)
    contextMenuPositionRef.current = null
  }, [
    setSelectedConceptId,
    setSelectedRelationshipId,
    setConceptEditorOpen,
    setRelationshipEditorOpen,
  ])

  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Helper function to create a concept at a position
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
        const newConceptId = id()

        // Create the new concept
        await db.transact([
          tx.concepts[newConceptId]
            .update({
              label: 'New Concept',
              positionX: position.x,
              positionY: position.y,
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({ map: currentMapId }),
        ])
        
        // Track the concept to start in edit mode
        setTimeout(() => {
          const allNodes = getNodes()
          const newNode = allNodes.find((node) => node.id === newConceptId)
          if (newNode) {
            const updatedNodes = allNodes.map((node) => {
              if (node.id === newConceptId) {
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
    [currentMapId, hasWriteAccess, getNodes, setNodes]
  )

  // Helper function to create a comment at a position
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

  // Use a ref to attach double-click handler to the React Flow pane
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null)
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
  }, [currentMapId, screenToFlowPosition, hasWriteAccess, handleCreateConceptAtPosition])

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
  }, [currentMapId, hasWriteAccess])

  // Handle context menu item clicks
  const handleContextMenuAddConcept = useCallback(() => {
    if (!contextMenuPositionRef.current) return
    
    // Convert screen position to flow position
    const flowPosition = screenToFlowPosition({
      x: contextMenuPositionRef.current.x,
      y: contextMenuPositionRef.current.y,
    })
    
    handleCreateConceptAtPosition(flowPosition)
  }, [screenToFlowPosition, handleCreateConceptAtPosition])

  const handleContextMenuAddComment = useCallback(() => {
    if (!contextMenuPositionRef.current) return
    
    // Convert screen position to flow position
    const flowPosition = screenToFlowPosition({
      x: contextMenuPositionRef.current.x,
      y: contextMenuPositionRef.current.y,
    })
    
    handleCreateCommentAtPosition(flowPosition)
  }, [screenToFlowPosition, handleCreateCommentAtPosition])

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapperRef}>
      {/* Render presence cursors for other users - isolated component with its own hook */}
      <PeerCursors />
      
      {/* Context menu */}
      <CanvasContextMenu
        visible={contextMenuVisible}
        position={contextMenuPosition}
        onClose={() => {
          setContextMenuVisible(false)
          setContextMenuPosition(null)
          contextMenuPositionRef.current = null
        }}
        onAddConcept={handleContextMenuAddConcept}
        onAddComment={handleContextMenuAddComment}
        hasWriteAccess={hasWriteAccess}
      />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypesRef.current}
        edgeTypes={edgeTypesRef.current}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={hasWriteAccess ? onConnectHandler : undefined}
        onConnectStart={hasWriteAccess ? onConnectStart : undefined}
        onConnectEnd={hasWriteAccess ? onConnectEnd : undefined}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodesDraggable={hasWriteAccess}
        nodesConnectable={hasWriteAccess}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        connectionLineComponent={CustomConnectionLine}
      >
        <Background />
        <Controls className="!bg-white !border !border-gray-300 !rounded-md !shadow-md !overflow-visible">
          {/* Graph/Text toggle buttons */}
          <button
            onClick={() => {
              if (textViewVisible) {
                setTextViewVisible(false)
              } else {
                setTextViewVisible(true)
              }
            }}
            className={`react-flow__controls-button ${textViewVisible ? '!bg-primary !text-primary-foreground' : ''}`}
            title={textViewVisible ? 'Hide text view' : 'Show text view'}
          >
            <FileText className="h-4 w-4" />
          </button>
          {/* Layout selector with slide-out menu */}
          <div className="h-px bg-gray-300" />
          <LayoutSelector
            activeLayout={activeLayout}
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
            onApplyLayout={handleApplyLayout}
            disabled={conceptNodes.length === 0}
          />
        </Controls>
        <MiniMap className="!bg-white !border !border-gray-300 !rounded-md !shadow-md" />
      </ReactFlow>
    </div>
  )
})

ConceptMapCanvasInner.displayName = 'ConceptMapCanvasInner'

/**
 * Main React Flow canvas component wrapper.
 * Provides ReactFlowProvider context for React Flow hooks.
 * 
 * @param props - Component props
 * @param ref - Forwarded ref for imperative API
 * @returns The concept map canvas wrapper JSX
 */
export const ConceptMapCanvas = forwardRef<ConceptMapCanvasRef, ConceptMapCanvasProps>(
  (props, ref) => {
    return (
      <ReactFlowProvider>
        <ConceptMapCanvasInner {...props} ref={ref} />
      </ReactFlowProvider>
    )
  }
)

ConceptMapCanvas.displayName = 'ConceptMapCanvas'