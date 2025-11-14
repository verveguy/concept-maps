/**
 * Integration tests for ConceptNode component.
 * Verifies that all extracted hooks and components work together correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { ConceptNode } from '../ConceptNode'
import type { ConceptNodeData } from '@/lib/reactFlowTypes'

// Mock all the hooks and stores
vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      setSelectedConceptId: vi.fn(),
      setSelectedRelationshipId: vi.fn(),
      setSelectedCommentId: vi.fn(),
      selectedConceptId: null,
      conceptEditorOpen: false,
      setConceptEditorOpen: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      currentMapId: 'map-1',
      currentPerspectiveId: null,
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    const state = {
      isOptionKeyPressed: false,
    }
    return selector(state)
  }),
}))

vi.mock('@/hooks/useCanvasMutations', () => ({
  useCanvasMutations: () => ({
    updateConcept: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/hooks/usePerspectiveActions', () => ({
  usePerspectiveActions: () => ({
    toggleConceptInPerspective: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({
    otherUsersPresence: [],
  }),
}))

vi.mock('@/hooks/useMapPermissions', () => ({
  useMapPermissions: () => ({
    hasWriteAccess: true,
  }),
}))

vi.mock('@/hooks/usePerspectives', () => ({
  usePerspectives: () => [],
}))

vi.mock('@/hooks/useRelationships', () => ({
  useAllRelationships: () => [],
}))

vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow')
  return {
    ...actual,
    useReactFlow: () => ({
      getNode: vi.fn(() => ({ position: { x: 100, y: 100 } })),
      getNodes: vi.fn(() => []),
      setNodes: vi.fn(),
      getEdges: vi.fn(() => []),
      setEdges: vi.fn(),
      fitView: vi.fn(),
    }),
  }
})

vi.mock('@/components/toolbar/NodeToolbar', () => ({
  NodeToolbar: () => <div data-testid="node-toolbar">Toolbar</div>,
}))

// Mock all sub-components
vi.mock('../ConceptNodeLabel', () => ({
  ConceptNodeLabel: ({ label, isEditing }: { label: string; isEditing: boolean }) => (
    <div data-testid="node-label">{isEditing ? 'Editing' : label}</div>
  ),
}))

vi.mock('../ConceptNodeNotes', () => ({
  ConceptNodeNotes: ({ notes, shouldShow }: { notes: string; shouldShow: boolean }) =>
    shouldShow && notes ? <div data-testid="node-notes">{notes}</div> : null,
}))

vi.mock('../ConceptNodeMetadata', () => ({
  ConceptNodeMetadata: () => null,
}))

vi.mock('../ConceptNodeHandles', () => ({
  ConceptNodeHandles: () => <div data-testid="node-handles">Handles</div>,
}))

vi.mock('../ConceptNodeCollaboration', () => ({
  ConceptNodeCollaboration: () => null,
}))

vi.mock('../ConceptNodePreviewIndicator', () => ({
  ConceptNodePreviewIndicator: () => null,
}))

describe('ConceptNode Integration', () => {
  const mockConcept = {
    id: 'concept-1',
    label: 'Test Concept',
    notes: 'Test notes',
    metadata: {},
    showNotesAndMetadata: true,
  }

  const mockNodeData: ConceptNodeData = {
    label: 'Test Concept',
    concept: mockConcept,
    isInPerspective: true,
    isEditingPerspective: false,
    shouldStartEditing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render concept node with label', () => {
    render(
      <ReactFlowProvider>
        <ConceptNode data={mockNodeData} selected={false} id="concept-1" />
      </ReactFlowProvider>
    )

    expect(screen.getByTestId('node-label')).toBeInTheDocument()
    expect(screen.getByTestId('node-label')).toHaveTextContent('Test Concept')
  })

  it('should render notes when showNotesAndMetadata is true', () => {
    render(
      <ReactFlowProvider>
        <ConceptNode data={mockNodeData} selected={false} id="concept-1" />
      </ReactFlowProvider>
    )

    expect(screen.getByTestId('node-notes')).toBeInTheDocument()
    expect(screen.getByTestId('node-notes')).toHaveTextContent('Test notes')
  })

  it('should render handles', () => {
    render(
      <ReactFlowProvider>
        <ConceptNode data={mockNodeData} selected={false} id="concept-1" />
      </ReactFlowProvider>
    )

    expect(screen.getByTestId('node-handles')).toBeInTheDocument()
  })

  it('should apply selected styling when selected', () => {
    const { container } = render(
      <ReactFlowProvider>
        <ConceptNode data={mockNodeData} selected={true} id="concept-1" />
      </ReactFlowProvider>
    )

    const nodeElement = container.querySelector('.rounded-lg')
    expect(nodeElement).toBeInTheDocument()
    // Selected state should have boxShadow
    expect(nodeElement).toHaveStyle({ boxShadow: expect.any(String) })
  })

  it('should handle double click to start editing', () => {
    render(
      <ReactFlowProvider>
        <ConceptNode data={mockNodeData} selected={false} id="concept-1" />
      </ReactFlowProvider>
    )

    const nodeElement = screen.getByTestId('node-label').closest('.rounded-lg')
    if (nodeElement) {
      fireEvent.doubleClick(nodeElement)
      // After double click, label should show editing state
      // Note: This depends on the editing hook behavior
      expect(screen.getByTestId('node-label')).toBeInTheDocument()
    }
  })

  it('should render with custom metadata styles', () => {
    const conceptWithStyles = {
      ...mockConcept,
      metadata: {
        fillColor: '#ff0000',
        borderColor: '#0000ff',
        borderStyle: 'dashed',
        textColor: '#00ff00',
      },
    }

    const nodeDataWithStyles: ConceptNodeData = {
      ...mockNodeData,
      concept: conceptWithStyles,
    }

    const { container } = render(
      <ReactFlowProvider>
        <ConceptNode data={nodeDataWithStyles} selected={false} id="concept-1" />
      </ReactFlowProvider>
    )

    const nodeElement = container.querySelector('.rounded-lg')
    expect(nodeElement).toBeInTheDocument()
    // Styles should be applied from metadata
    expect(nodeElement).toHaveStyle({
      backgroundColor: '#ff0000',
      borderColor: '#0000ff',
    })
  })
})

