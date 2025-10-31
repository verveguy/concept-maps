import React, { useCallback, useMemo, useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { conceptsToNodes, relationshipsToEdges } from '@/lib/data'
import { useConcepts, useAllConcepts } from '@/hooks/useConcepts'
import { useRelationships, useAllRelationships } from '@/hooks/useRelationships'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { db, tx, id } from '@/lib/instant'
import { nodeTypes, edgeTypes } from './reactFlowTypes'
import type { LayoutType } from '@/lib/layouts'
import { applyForceDirectedLayout, applyHierarchicalLayout } from '@/lib/layouts'
import { Network, Layers, Network as NetworkIcon, FileText } from 'lucide-react'
import { usePresence } from '@/hooks/usePresence'
import { PresenceCursor } from '@/components/presence/PresenceCursor'

interface ConceptMapCanvasProps {
  onCreateConcept?: (position: { x: number; y: number }) => void
}

export interface ConceptMapCanvasRef {
  applyLayout: (layoutType: LayoutType) => Promise<void>
}

/**
 * Inner component that uses ReactFlow hooks
 */
const ConceptMapCanvasInner = forwardRef<ConceptMapCanvasRef, ConceptMapCanvasProps>(
  ({ onCreateConcept }, ref) => {
  // Use refs to ensure nodeTypes and edgeTypes have stable references
  // This prevents React Flow from detecting them as new objects on each render
  const nodeTypesRef = useRef(nodeTypes)
  const edgeTypesRef = useRef(edgeTypes)
  
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = useMapStore((state) => state.isEditingPerspective)
  
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
  
  const concepts = isEditingPerspective ? allConcepts : filteredConcepts
  const relationships = isEditingPerspective ? allRelationships : filteredRelationships
  const { updateConcept } = useConceptActions()
  const { createRelationship } = useRelationshipActions()
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
  const { screenToFlowPosition, flowToScreenPosition, fitView, getViewport } = useReactFlow()
  
  // Presence tracking
  const { otherUsersPresence, setCursor, setEditingNode, setEditingEdge } = usePresence()
  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)
  
  // Track cursor movement on the React Flow pane
  // Convert screen coordinates to flow coordinates for storage
  useEffect(() => {
    const reactFlowPane = document.querySelector('.react-flow')
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

  // Add text view node if visible
  const allNodes = useMemo(() => {
    const nodes = [...newNodes]
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
  }, [newNodes, textViewVisible, textViewPosition])

  // Track previous data to avoid unnecessary updates
  const prevConceptsRef = useRef(concepts)
  const prevRelationshipsRef = useRef(relationships)
  const prevTextViewVisibleRef = useRef(textViewVisible)
  const prevPerspectiveConceptIdsRef = useRef<string | undefined>(perspectiveConceptIds ? Array.from(perspectiveConceptIds).sort().join(',') : undefined)
  const prevPerspectiveRelationshipIdsRef = useRef<string | undefined>(perspectiveRelationshipIds ? Array.from(perspectiveRelationshipIds).sort().join(',') : undefined)
  const prevIsEditingPerspectiveRef = useRef(isEditingPerspective)

  // React Flow state management - initialize with data
  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(newEdges)

  // Expose layout handler via ref (must be after nodes/edges are initialized)
  useImperativeHandle(ref, () => ({
    applyLayout: async (layoutType: LayoutType) => {
      if (!currentMapId) return
      
      const conceptNodesArray = nodes.filter(n => n.type === 'concept')
      if (conceptNodesArray.length === 0) return

      let layoutNodes: Node[]
      
      if (layoutType === 'force-directed') {
        layoutNodes = applyForceDirectedLayout(conceptNodesArray, edges, {
          width: 2000,
          height: 2000,
        })
      } else if (layoutType === 'hierarchical') {
        layoutNodes = applyHierarchicalLayout(conceptNodesArray, edges, {
          direction: 'TB',
          nodeWidth: 150,
          nodeHeight: 100,
        })
      } else {
        return // Manual layout - no changes
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

  // Layout handler function for buttons
  const handleApplyLayout = useCallback(
    async (layoutType: LayoutType) => {
      if (!currentMapId) return
      
      const conceptNodesArray = nodes.filter(n => n.type === 'concept')
      if (conceptNodesArray.length === 0) return

      let layoutNodes: Node[]
      
      if (layoutType === 'force-directed') {
        layoutNodes = applyForceDirectedLayout(conceptNodesArray, edges, {
          width: 2000,
          height: 2000,
        })
      } else if (layoutType === 'hierarchical') {
        layoutNodes = applyHierarchicalLayout(conceptNodesArray, edges, {
          direction: 'TB',
          nodeWidth: 150,
          nodeHeight: 100,
        })
      } else {
        return // Manual layout - no changes
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
        
        // Fit view to show all nodes after layout
        setTimeout(() => {
          fitView({ padding: 0.1 })
        }, 100)
      } catch (error) {
        console.error('Failed to apply layout:', error)
        alert('Failed to apply layout. Please try again.')
      }
    },
    [nodes, edges, currentMapId, fitView]
  )
  
  // Memoize concept nodes to avoid recreating the filter on every render
  const conceptNodes = useMemo(() => nodes.filter(n => n.type === 'concept'), [nodes])

  // Sync InstantDB data changes to React Flow only when data actually changes
  useEffect(() => {
    // Only update if concepts actually changed (by ID, position, label, or metadata)
    const conceptsChanged = 
      concepts.length !== prevConceptsRef.current.length ||
      concepts.some((c, i) => {
        const prev = prevConceptsRef.current[i]
        if (!prev) return true
        if (c.id !== prev.id) return true
        if (c.position.x !== prev.position.x) return true
        if (c.position.y !== prev.position.y) return true
        if (c.label !== prev.label) return true
        // Check if metadata changed (compare JSON strings)
        const metadataChanged = JSON.stringify(c.metadata || {}) !== JSON.stringify(prev.metadata || {})
        return metadataChanged
      })

    // Check if perspective inclusion state changed
    const currentPerspectiveKey = perspectiveConceptIds ? Array.from(perspectiveConceptIds).sort().join(',') : undefined
    const perspectiveChanged = 
      currentPerspectiveKey !== prevPerspectiveConceptIdsRef.current ||
      isEditingPerspective !== prevIsEditingPerspectiveRef.current

    if (conceptsChanged || perspectiveChanged || textViewVisible !== prevTextViewVisibleRef.current) {
      setNodes(allNodes)
      prevConceptsRef.current = concepts
      prevTextViewVisibleRef.current = textViewVisible
      prevPerspectiveConceptIdsRef.current = currentPerspectiveKey
      prevIsEditingPerspectiveRef.current = isEditingPerspective
    }
  }, [allNodes, concepts, textViewVisible, perspectiveConceptIds, isEditingPerspective, setNodes])

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

    if (relationshipsChanged || perspectiveRelationshipChanged) {
      setEdges(newEdges)
      prevRelationshipsRef.current = relationships
      prevPerspectiveRelationshipIdsRef.current = currentPerspectiveRelationshipKey
      prevIsEditingPerspectiveRef.current = isEditingPerspective
    }
  }, [newEdges, relationships, perspectiveRelationshipIds, isEditingPerspective, setEdges])

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
  const onConnectStart = useCallback(
    (_event: React.MouseEvent, { nodeId }: { nodeId: string | null }) => {
      if (!nodeId) return

      // Get the node position and store connection start info
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
      if (!currentMapId || !connectionStart) {
        setConnectionStart(null)
        return
      }

      // Check if connection ended on a node
      const target = event.target as HTMLElement
      const targetNode = target.closest('.react-flow__node')

      if (!targetNode) {
        // Connection ended on empty space - create new concept and relationship
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        try {
          // Generate IDs for both concept and relationship
          const newConceptId = id()
          const newRelationshipId = id()

          // Create both concept and relationship in a single transaction
          await db.transact([
            // Create the new concept
            tx.concepts[newConceptId].update({
              mapId: currentMapId,
              label: 'New Concept',
              positionX: position.x,
              positionY: position.y,
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
            // Create the relationship linking source to new concept
            tx.relationships[newRelationshipId].update({
              mapId: currentMapId,
              fromConceptId: connectionStart.sourceId,
              toConceptId: newConceptId,
              primaryLabel: 'related to',
              reverseLabel: 'related from',
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          ])
        } catch (error) {
          console.error('Failed to create concept and relationship from connection:', error)
        }
      }

      setConnectionStart(null)
    },
    [
      currentMapId,
      connectionStart,
      screenToFlowPosition,
    ]
  )

  // Track last update time for each node to throttle updates
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map())
  const THROTTLE_MS = 100 // Update every 100ms maximum

  // Handle node drag - update position in database with throttling
  const onNodeDrag = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!currentMapId) return

      // Handle text view node position update (no throttling needed for UI state)
      if (node.id === 'text-view-node') {
        setTextViewPosition(node.position)
        return
      }

      const concept = concepts.find((c) => c.id === node.id)
      if (!concept) return

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
          await updateConcept(node.id, {
            position: { x: node.position.x, y: node.position.y },
          })
        } catch (error) {
          console.error(`Failed to update concept ${node.id} position:`, error)
        }
      }
    },
    [currentMapId, concepts, updateConcept, setTextViewPosition, screenToFlowPosition, setCursor]
  )

  // Handle node drag end - ensure final position is saved
  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!currentMapId) return
      
      // Handle text view node position update
      if (node.id === 'text-view-node') {
        setTextViewPosition(node.position)
        return
      }

      const concept = concepts.find((c) => c.id === node.id)
      if (!concept) return

      // Update cursor position to final position
      const flowPosition = screenToFlowPosition({
        x: _event.clientX,
        y: _event.clientY,
      })
      setCursor(flowPosition)

      // Always save final position immediately on drag stop
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
    },
    [concepts, currentMapId, updateConcept, setTextViewPosition, screenToFlowPosition, setCursor]
  )

  // Handle node click - let ConceptNode handle clicks (to distinguish single vs double-click)
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
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
  const onConnect = useCallback(
    async (connection: OnConnect) => {
      if (!currentMapId || !connection.source || !connection.target) return

      // Reset connection start tracking
      setConnectionStart(null)

      try {
        await createRelationship({
          mapId: currentMapId,
          fromConceptId: connection.source,
          toConceptId: connection.target,
          primaryLabel: 'related to',
          reverseLabel: 'related from',
        })
      } catch (error) {
        console.error('Failed to create relationship:', error)
      }
    },
    [currentMapId, createRelationship]
  )

  // Handle pane click - deselect
  const onPaneClick = useCallback(() => {
    setSelectedConceptId(null)
    setSelectedRelationshipId(null)
    setConceptEditorOpen(false)
    setRelationshipEditorOpen(false)
  }, [
    setSelectedConceptId,
    setSelectedRelationshipId,
    setConceptEditorOpen,
    setRelationshipEditorOpen,
  ])

  // Handle double-click on pane - create concept
  // Note: React Flow doesn't support onPaneDoubleClick directly, so we'll handle it via a wrapper div
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onCreateConcept) return

      // Check if clicking on the background (not on a node or edge)
      const target = event.target as HTMLElement
      if (
        target.closest('.react-flow__node') ||
        target.closest('.react-flow__edge')
      ) {
        return
      }

      // Get the position in flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      onCreateConcept(position)
    },
    [onCreateConcept, screenToFlowPosition]
  )

  return (
    <div className="w-full h-full relative" onDoubleClick={handleDoubleClick}>
      {/* Render presence cursors for other users */}
      {otherUsersPresence.map((presence) => (
        <PresenceCursor
          key={presence.userId}
          presence={presence}
          flowToScreenPosition={flowToScreenPosition}
        />
      ))}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypesRef.current}
        edgeTypes={edgeTypesRef.current}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        connectionLineType="smoothstep"
      >
        <Background />
        <Controls className="!bg-white !border !border-gray-300 !rounded-md !shadow-md">
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
          {/* Custom layout buttons */}
          <div className="h-px bg-gray-300" />
          <button
            onClick={() => handleApplyLayout('force-directed')}
            disabled={nodes.filter(n => n.type === 'concept').length === 0}
            className="react-flow__controls-button"
            title="Force-directed layout (spreads nodes evenly)"
          >
            <Network className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleApplyLayout('hierarchical')}
            disabled={nodes.filter(n => n.type === 'concept').length === 0}
            className="react-flow__controls-button"
            title="Hierarchical layout (top-to-bottom tree)"
          >
            <Layers className="h-4 w-4" />
          </button>
        </Controls>
        <MiniMap className="!bg-white !border !border-gray-300 !rounded-md !shadow-md" />
      </ReactFlow>
    </div>
  )
})

ConceptMapCanvasInner.displayName = 'ConceptMapCanvasInner'

/**
 * Main React Flow canvas component wrapper
 * Provides ReactFlowProvider context
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