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

import { useMemo, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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
import { useCanvasNodeHandlers } from '@/hooks/useCanvasNodeHandlers'
import { useCanvasEdgeHandlers } from '@/hooks/useCanvasEdgeHandlers'
import { useCanvasConnectionHandlers } from '@/hooks/useCanvasConnectionHandlers'
import { useCanvasPaneHandlers } from '@/hooks/useCanvasPaneHandlers'
import { useCanvasLayout } from '@/hooks/useCanvasLayout'
import { useCanvasDataSync } from '@/hooks/useCanvasDataSync'
import { useCanvasCreation } from '@/hooks/useCanvasCreation'
import { useCanvasDeepLinking } from '@/hooks/useCanvasDeepLinking'
import { useCanvasPresence } from '@/hooks/useCanvasPresence'
import type { LayoutType } from '@/lib/layouts'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { nodeTypes, edgeTypes } from './reactFlowTypes'
import { FileText } from 'lucide-react'
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
  
  // Canvas store state - centralized canvas-specific state management
  const {
    contextMenuVisible,
    setContextMenuVisible,
    contextMenuPosition,
    setContextMenuPosition,
    resetCanvasState,
    clearLaidOutNodeIds,
  } = useCanvasStore()
  
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = useMapStore((state) => state.isEditingPerspective)
  const shouldAutoCenterConcept = useMapStore((state) => state.shouldAutoCenterConcept)
  const setIsOptionKeyPressed = useCanvasStore((state) => state.setIsOptionKeyPressed)
  
  // Ref for the React Flow wrapper div (used for event handlers)
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null)
  
  // Track if this is the initial mount (for fitView prop - only use on first mount)
  // Note: We don't use fitView prop when navigating directly via URL, only on true initial app load
  const isInitialMountRef = useRef(true)
  const hasInitialMapIdRef = useRef<string | null>(null)

  // Track Option/Alt key state globally (single listener for all nodes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only check for Alt key - Option key on Mac maps to Alt key
      // Meta key is Command key, not Option key
      if (e.key === 'Alt') {
        setIsOptionKeyPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsOptionKeyPressed(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [setIsOptionKeyPressed])
  
  // Reset canvas state when switching maps
  useEffect(() => {
    if (!currentMapId) return
    
    clearLaidOutNodeIds()
    resetCanvasState()
    
    // Track if we had an initial map ID on mount (direct URL navigation)
    if (isInitialMountRef.current && hasInitialMapIdRef.current === null) {
      hasInitialMapIdRef.current = currentMapId
    }
    
    // Mark that we're no longer on initial mount after first map load
    if (isInitialMountRef.current && hasInitialMapIdRef.current !== currentMapId) {
      isInitialMountRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapId]) // Only depend on currentMapId - store actions are stable
  
  // Check if user has write access and read access to the current map
  const { hasWriteAccess, hasReadAccess } = useMapPermissions()
  
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
  const { 
    textViewVisible,
    setTextViewVisible,
    textViewPosition,
  } = useUIStore()
  const { screenToFlowPosition, fitView, getNode, setCenter, getViewport, getNodes: getNodesFromFlow, setNodes: setNodesFromFlow } = useReactFlow()
  
  // Presence hook - handles cursor tracking and editing state updates
  useCanvasPresence({
    screenToFlowPosition,
  })

  // Transform InstantDB data to React Flow format (memoized)
  const transformedNodes = useMemo(() => {
    const conceptNodes = conceptsToNodes(concepts, perspectiveConceptIds, isEditingPerspective)
    const commentNodesArray = commentsToNodes(comments, perspectiveConceptIds)
    const nodes = [...conceptNodes, ...commentNodesArray]
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
  }, [concepts, comments, perspectiveConceptIds, isEditingPerspective, textViewVisible, textViewPosition])

  const transformedEdges = useMemo(() => {
    const relationshipEdges = relationshipsToEdges(relationships, perspectiveRelationshipIds, isEditingPerspective)
    const commentEdgesArray = commentsToEdges(comments, concepts, perspectiveConceptIds)
    return [...relationshipEdges, ...commentEdgesArray]
  }, [relationships, comments, concepts, perspectiveRelationshipIds, perspectiveConceptIds, isEditingPerspective])

  // React Flow state management - initialize with transformed data
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(transformedNodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(transformedEdges)

  // Data synchronization hook - syncs InstantDB changes to React Flow state
  useCanvasDataSync({
    transformedNodes,
    transformedEdges,
    concepts,
    relationships,
    comments,
    perspectiveConceptIds,
    perspectiveRelationshipIds,
    isEditingPerspective,
    textViewVisible,
    setNodes,
    setEdges,
  })

  // Node handlers hook - handles node changes, drag, and click events
  const {
    onNodesChange,
    onNodeDrag,
    onNodeDragStop,
    onNodeClick,
  } = useCanvasNodeHandlers({
    concepts,
    comments,
    relationships,
    nodes,
    onNodesChangeBase,
    screenToFlowPosition,
  })

  // Edge handlers hook - handles edge changes and click events
  const {
    onEdgesChange,
    onEdgeClick,
  } = useCanvasEdgeHandlers({
    edges,
    onEdgesChangeBase,
  })

  // Connection handlers hook - handles connection start, end, and connect events
  const {
    onConnectStart,
    onConnectEnd,
    onConnect,
  } = useCanvasConnectionHandlers({
    nodes,
    screenToFlowPosition,
  })

  // Pane handlers hook - handles pane click, double-click, right-click, and context menu
  const {
    onPaneClick,
    handleContextMenuAddConcept,
    handleContextMenuAddComment,
  } = useCanvasPaneHandlers({
    reactFlowWrapperRef,
    screenToFlowPosition,
    getNodes: getNodesFromFlow,
    setNodes: setNodesFromFlow,
  })

  // Layout hook - handles layout application, sticky layout, and auto-apply
  const {
    applyLayout: handleApplyLayout,
    applyLayoutSimple,
    activeLayout,
    selectedLayout,
    setSelectedLayout,
  } = useCanvasLayout({
    nodes,
    edges,
    conceptIds: concepts.map(c => c.id),
    getNodes: getNodesFromFlow,
    getEdges: () => edges,
    fitView,
  })

  // Update newly created relationship edges to start in edit mode
  // Watch for when the relationship appears in the relationships array and update the corresponding edge
  useEffect(() => {
    // Get current store state inside effect to avoid dependency issues
    const currentNewlyCreatedRelationshipIds = useCanvasStore.getState().newlyCreatedRelationshipIds
    const relationshipIdsToUpdate = Array.from(
      currentNewlyCreatedRelationshipIds.values()
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
            const store = useCanvasStore.getState()
            for (const [conceptId, relId] of store.newlyCreatedRelationshipIds.entries()) {
              if (relId === relationshipId) {
                store.removeNewlyCreatedRelationship(conceptId)
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
  }, [filteredRelationships, allRelationships, isEditingPerspective, edges, setEdges]) // Store state accessed inside, not in deps

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

  // Creation hook - handles pending relationship creation (drag-to-create flow)
  useCanvasCreation({
    concepts,
    getNodes: getNodesFromFlow,
    setNodes: setNodesFromFlow,
  })

  // Deep linking hook - handles concept centering from URL
  useCanvasDeepLinking({
    concepts,
    nodes,
    setNodes: setNodesFromFlow,
    fitView,
    getNode,
    setCenter,
    getViewport,
  })

  // Automatic zoom-to-fit when opening a map (if not doing deep linking)
  // Track if we've already zoomed for the current map to prevent re-zooming on every render
  const hasZoomedForMapRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)
  const cancelledRef = useRef(false)
  const reactFlowReadyRef = useRef(false)
  
  useEffect(() => {
    isMountedRef.current = true
    cancelledRef.current = false
    reactFlowReadyRef.current = false // Reset when component mounts
    return () => {
      isMountedRef.current = false
      cancelledRef.current = true
    }
  }, [])
  
  // Track when React Flow is ready via onInit callback
  const handleReactFlowLoad = useRef(() => {
    console.log('[zoom-to-fit] React Flow onInit called')
    reactFlowReadyRef.current = true
  }).current

  useEffect(() => {
    // Only zoom-to-fit if:
    // 1. Map is loaded
    // 2. User has read access
    // 3. Nodes are loaded (check for concept nodes specifically, not just any nodes)
    // 4. NOT doing deep linking (shouldAutoCenterConcept is false)
    // 5. Haven't already zoomed for this map
    if (
      !currentMapId ||
      !hasReadAccess ||
      nodes.length === 0 ||
      shouldAutoCenterConcept ||
      hasZoomedForMapRef.current === currentMapId
    ) {
      return
    }

    // Mark that we've zoomed for this map BEFORE async operations
    hasZoomedForMapRef.current = currentMapId

    // Use async approach similar to deep linking hook for better reliability
    ;(async () => {
      // Wait for React Flow to be ready (poll until onInit has been called, but with timeout)
      let tries = 0
      const maxWaitTries = 200 // ~3 seconds max wait (200 * ~16ms per frame)
      while (!reactFlowReadyRef.current && tries < maxWaitTries && isMountedRef.current && !cancelledRef.current) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        tries++
      }
      
      // If React Flow never initialized, log warning but continue anyway
      if (!reactFlowReadyRef.current && isMountedRef.current) {
        console.warn('[zoom-to-fit] React Flow onInit not called within timeout, proceeding anyway')
      }
      
      // Additional delay to ensure nodes are rendered
      await new Promise((resolve) => setTimeout(resolve, 300))
      
      // Check if component is still mounted and not cancelled
      if (!isMountedRef.current || cancelledRef.current) {
        return
      }

      // Double-check that we still have nodes (check from React Flow to avoid stale closure)
      const currentNodes = getNodesFromFlow()
      if (currentNodes.length === 0) {
        console.warn('[zoom-to-fit] No nodes found after wait, skipping zoom-to-fit')
        return
      }

      // Wait for next frame to ensure DOM is fully rendered
      await new Promise((resolve) => requestAnimationFrame(resolve))
      
      // Check again if component is still mounted
      if (!isMountedRef.current || cancelledRef.current) {
        return
      }
      
      // Final check that nodes are still present
      const finalNodes = getNodesFromFlow()
      if (finalNodes.length === 0) {
        console.warn('[zoom-to-fit] No nodes found in final check, skipping zoom-to-fit')
        return
      }
      
      // Wait for zoom change using requestAnimationFrame polling (similar to deep linking hook)
      const waitForZoomChange = (initialZoom: number, maxTries = 60): Promise<void> => {
        return new Promise((resolve) => {
          let tries = 0
          const check = () => {
            if (cancelledRef.current || !isMountedRef.current) return
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
      
      // Get initial zoom before fitView
      const initialZoom = getViewport().zoom
      
      try {
        // Call fitView with padding and duration
        fitView({ padding: 0.1, duration: 300 })
        
        // Wait for zoom change to ensure fitView animation completes (similar to deep linking)
        await waitForZoomChange(initialZoom)
        
        if (isMountedRef.current && !cancelledRef.current) {
          const viewportAfter = getViewport()
          console.log('[zoom-to-fit] Zoom-to-fit completed', {
            initialZoom,
            finalZoom: viewportAfter.zoom,
            viewport: viewportAfter,
          })
        }
      } catch (error) {
        // Silently handle errors (component may have unmounted)
        if (isMountedRef.current) {
          console.error('[zoom-to-fit] Error calling fitView:', error)
        }
      }
    })().catch((error) => {
      // Handle any errors silently (component may have unmounted)
      if (isMountedRef.current) {
        console.error('[zoom-to-fit] Error in async zoom-to-fit:', error)
      }
    })
  }, [currentMapId, hasReadAccess, nodes.length, shouldAutoCenterConcept, fitView, getNodesFromFlow, getViewport])

  // Expose layout handler via ref (must be after nodes/edges are initialized)
  useImperativeHandle(ref, () => ({
    applyLayout: applyLayoutSimple,
  }), [applyLayoutSimple])
  
  // Memoize concept nodes to avoid recreating the filter on every render
  const conceptNodes = useMemo(() => nodes.filter(n => n.type === 'concept'), [nodes])

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
        }}
        onAddConcept={handleContextMenuAddConcept}
        onAddComment={handleContextMenuAddComment}
        hasWriteAccess={hasWriteAccess}
      />
      
      <ReactFlow
        id="concept-map-canvas"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypesRef.current}
        edgeTypes={edgeTypesRef.current}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={hasWriteAccess ? onConnect : undefined}
        onConnectStart={hasWriteAccess ? onConnectStart : undefined}
        onConnectEnd={hasWriteAccess ? onConnectEnd : undefined}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onInit={handleReactFlowLoad}
        nodesDraggable={hasWriteAccess}
        nodesConnectable={hasWriteAccess}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        connectionLineComponent={CustomConnectionLine}
      >
        <Background />
        <Controls className="!bg-card !border !border-border !rounded-md !shadow-md !overflow-visible">
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
          <div className="h-px bg-border" />
          <LayoutSelector
            activeLayout={activeLayout}
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
            onApplyLayout={handleApplyLayout}
            disabled={conceptNodes.length === 0}
          />
        </Controls>
        <MiniMap className="!bg-card !border !border-border !rounded-md !shadow-md" />
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