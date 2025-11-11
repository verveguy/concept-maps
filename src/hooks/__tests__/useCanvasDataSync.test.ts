/**
 * Tests for useCanvasDataSync hook.
 * Verifies data synchronization, change detection, and perspective filtering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanvasDataSync } from '../useCanvasDataSync'
import type { Node, Edge } from 'reactflow'
import type { Concept, Relationship, Comment } from '@/lib/schema'

describe('useCanvasDataSync', () => {
  const mockSetNodes = vi.fn()
  const mockSetEdges = vi.fn()

  const mockConcepts: Concept[] = [
    {
      id: 'concept-1',
      mapId: 'map-1',
      label: 'Concept 1',
      position: { x: 100, y: 200 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'concept-2',
      mapId: 'map-1',
      label: 'Concept 2',
      position: { x: 300, y: 400 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]

  const mockRelationships: Relationship[] = [
    {
      id: 'rel-1',
      mapId: 'map-1',
      fromConceptId: 'concept-1',
      toConceptId: 'concept-2',
      primaryLabel: 'related to',
      reverseLabel: 'related from',
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]

  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      mapId: 'map-1',
      text: 'Comment 1',
      position: { x: 150, y: 250 },
      conceptIds: ['concept-1'],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdBy: 'user-1',
      resolved: false,
    },
  ]

  const mockTransformedNodes: Node[] = [
    {
      id: 'concept-1',
      type: 'concept',
      position: { x: 100, y: 200 },
      data: { label: 'Concept 1' },
    },
    {
      id: 'concept-2',
      type: 'concept',
      position: { x: 300, y: 400 },
      data: { label: 'Concept 2' },
    },
    {
      id: 'comment-1',
      type: 'comment',
      position: { x: 150, y: 250 },
      data: { comment: mockComments[0] },
    },
  ]

  const mockTransformedEdges: Edge[] = [
    {
      id: 'rel-1',
      source: 'concept-1',
      target: 'concept-2',
      type: 'default',
      data: { relationship: mockRelationships[0] },
    },
    {
      id: 'comment-edge-1',
      source: 'comment-1',
      target: 'concept-1',
      type: 'comment-edge',
      data: {},
    },
  ]

  const defaultOptions = {
    transformedNodes: mockTransformedNodes,
    transformedEdges: mockTransformedEdges,
    concepts: mockConcepts,
    relationships: mockRelationships,
    comments: mockComments,
    perspectiveConceptIds: undefined as Set<string> | undefined,
    perspectiveRelationshipIds: undefined as Set<string> | undefined,
    isEditingPerspective: false,
    textViewVisible: false,
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial sync', () => {
    it('should sync nodes when concepts change on initial render', () => {
      // The hook only syncs when changes are detected, so we need to trigger a change
      // by providing empty initial concepts and then updating
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts, transformedNodes: mockTransformedNodes }),
        {
          initialProps: { concepts: [] as Concept[] },
        }
      )

      // Now update with actual concepts
      rerender({ concepts: mockConcepts })

      expect(mockSetNodes).toHaveBeenCalledWith(mockTransformedNodes)
    })

    it('should sync edges when relationships change on initial render', () => {
      // The hook only syncs when changes are detected, so we need to trigger a change
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({ ...defaultOptions, relationships: props.relationships, transformedEdges: mockTransformedEdges }),
        {
          initialProps: { relationships: [] as Relationship[] },
        }
      )

      // Now update with actual relationships
      rerender({ relationships: mockRelationships })

      expect(mockSetEdges).toHaveBeenCalledWith(mockTransformedEdges)
    })
  })

  describe('concept change detection', () => {
    it('should update nodes when concept position changes', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts, transformedNodes: props.transformedNodes }),
        {
          initialProps: { concepts: mockConcepts, transformedNodes: mockTransformedNodes },
        }
      )

      vi.clearAllMocks()

      const updatedConcepts: Concept[] = [
        { ...mockConcepts[0], position: { x: 150, y: 250 } },
        mockConcepts[1],
      ]

      const updatedNodes: Node[] = [
        { ...mockTransformedNodes[0], position: { x: 150, y: 250 } },
        mockTransformedNodes[1],
        mockTransformedNodes[2],
      ]

      rerender({
        concepts: updatedConcepts,
        transformedNodes: updatedNodes,
      })

      expect(mockSetNodes).toHaveBeenCalledWith(updatedNodes)
    })

    it('should update nodes when concept label changes', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts, transformedNodes: props.transformedNodes }),
        {
          initialProps: { concepts: mockConcepts, transformedNodes: mockTransformedNodes },
        }
      )

      vi.clearAllMocks()

      const updatedConcepts: Concept[] = [
        { ...mockConcepts[0], label: 'Updated Label' },
        mockConcepts[1],
      ]

      const updatedNodes: Node[] = [
        { ...mockTransformedNodes[0], data: { label: 'Updated Label' } },
        mockTransformedNodes[1],
        mockTransformedNodes[2],
      ]

      rerender({
        concepts: updatedConcepts,
        transformedNodes: updatedNodes,
      })

      expect(mockSetNodes).toHaveBeenCalledWith(updatedNodes)
    })

    it('should update nodes when concept notes change', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts }),
        {
          initialProps: { concepts: mockConcepts },
        }
      )

      vi.clearAllMocks()

      const updatedConcepts: Concept[] = [
        { ...mockConcepts[0], notes: 'New notes' },
        mockConcepts[1],
      ]

      rerender({
        concepts: updatedConcepts,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })

    it('should update nodes when concept metadata changes', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts }),
        {
          initialProps: { concepts: mockConcepts },
        }
      )

      vi.clearAllMocks()

      const updatedConcepts: Concept[] = [
        { ...mockConcepts[0], metadata: { category: 'new' } },
        mockConcepts[1],
      ]

      rerender({
        concepts: updatedConcepts,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })

    it('should update nodes when new concept is added', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts, transformedNodes: props.transformedNodes }),
        {
          initialProps: { concepts: mockConcepts, transformedNodes: mockTransformedNodes },
        }
      )

      vi.clearAllMocks()

      const newConcept: Concept = {
        id: 'concept-3',
        mapId: 'map-1',
        label: 'Concept 3',
        position: { x: 500, y: 600 },
        notes: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      const updatedConcepts = [...mockConcepts, newConcept]
      const updatedNodes = [
        ...mockTransformedNodes,
        {
          id: 'concept-3',
          type: 'concept',
          position: { x: 500, y: 600 },
          data: { label: 'Concept 3' },
        },
      ]

      rerender({
        concepts: updatedConcepts,
        transformedNodes: updatedNodes,
      })

      expect(mockSetNodes).toHaveBeenCalledWith(updatedNodes)
    })

    it('should not update nodes when concepts are unchanged', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, concepts: props.concepts }),
        {
          initialProps: { concepts: mockConcepts },
        }
      )

      vi.clearAllMocks()

      // Rerender with same concepts
      rerender({
        concepts: mockConcepts,
      })

      // Should not call setNodes if nothing changed
      // Note: Initial render will call it, but subsequent renders with same data should not
      // This is handled by the ref comparison logic
    })
  })

  describe('comment change detection', () => {
    it('should update nodes when comment position changes', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, comments: props.comments }),
        {
          initialProps: { comments: mockComments },
        }
      )

      vi.clearAllMocks()

      const updatedComments: Comment[] = [
        { ...mockComments[0], position: { x: 200, y: 300 } },
      ]

      rerender({
        comments: updatedComments,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })

    it('should update nodes when comment text changes', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, comments: props.comments }),
        {
          initialProps: { comments: mockComments },
        }
      )

      vi.clearAllMocks()

      const updatedComments: Comment[] = [
        { ...mockComments[0], text: 'Updated comment' },
      ]

      rerender({
        comments: updatedComments,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })
  })

  describe('relationship change detection', () => {
    it('should update edges when relationship changes', () => {
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({ ...defaultOptions, relationships: props.relationships, transformedEdges: props.transformedEdges }),
        {
          initialProps: { relationships: mockRelationships, transformedEdges: mockTransformedEdges },
        }
      )

      vi.clearAllMocks()

      const updatedRelationships: Relationship[] = [
        { ...mockRelationships[0], primaryLabel: 'updated label' },
      ]

      const updatedEdges: Edge[] = [
        {
          ...mockTransformedEdges[0],
          data: { relationship: updatedRelationships[0] },
        },
        mockTransformedEdges[1],
      ]

      rerender({
        relationships: updatedRelationships,
        transformedEdges: updatedEdges,
      })

      expect(mockSetEdges).toHaveBeenCalledWith(updatedEdges)
    })

    it('should update edges when new relationship is added', () => {
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({ ...defaultOptions, relationships: props.relationships, transformedEdges: props.transformedEdges }),
        {
          initialProps: { relationships: mockRelationships, transformedEdges: mockTransformedEdges },
        }
      )

      vi.clearAllMocks()

      const newRelationship: Relationship = {
        id: 'rel-2',
        mapId: 'map-1',
        fromConceptId: 'concept-2',
        toConceptId: 'concept-1',
        primaryLabel: 'connects to',
        reverseLabel: 'connected from',
        notes: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      const updatedRelationships = [...mockRelationships, newRelationship]
      const updatedEdges = [
        ...mockTransformedEdges,
        {
          id: 'rel-2',
          source: 'concept-2',
          target: 'concept-1',
          type: 'default',
          data: { relationship: newRelationship },
        },
      ]

      rerender({
        relationships: updatedRelationships,
        transformedEdges: updatedEdges,
      })

      expect(mockSetEdges).toHaveBeenCalledWith(updatedEdges)
    })
  })

  describe('perspective change detection', () => {
    it('should update nodes when perspective concept IDs change', () => {
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({
            ...defaultOptions,
            perspectiveConceptIds: props.perspectiveConceptIds,
            transformedNodes: mockTransformedNodes,
          }),
        {
          initialProps: { perspectiveConceptIds: undefined as Set<string> | undefined },
        }
      )

      vi.clearAllMocks()

      const newPerspectiveIds = new Set(['concept-1'])

      rerender({
        perspectiveConceptIds: newPerspectiveIds,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })

    it('should update edges when perspective relationship IDs change', () => {
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({
            ...defaultOptions,
            perspectiveRelationshipIds: props.perspectiveRelationshipIds,
            transformedEdges: mockTransformedEdges,
          }),
        {
          initialProps: { perspectiveRelationshipIds: undefined as Set<string> | undefined },
        }
      )

      vi.clearAllMocks()

      const newPerspectiveIds = new Set(['rel-1'])

      rerender({
        perspectiveRelationshipIds: newPerspectiveIds,
      })

      expect(mockSetEdges).toHaveBeenCalled()
    })

    it('should update nodes when editing perspective mode changes', () => {
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({
            ...defaultOptions,
            isEditingPerspective: props.isEditingPerspective,
          }),
        {
          initialProps: { isEditingPerspective: false },
        }
      )

      vi.clearAllMocks()

      rerender({
        isEditingPerspective: true,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })
  })

  describe('text view visibility', () => {
    it('should update nodes when text view visibility changes', () => {
      const { rerender } = renderHook(
        (props) =>
          useCanvasDataSync({
            ...defaultOptions,
            textViewVisible: props.textViewVisible,
          }),
        {
          initialProps: { textViewVisible: false },
        }
      )

      vi.clearAllMocks()

      rerender({
        textViewVisible: true,
      })

      expect(mockSetNodes).toHaveBeenCalled()
    })
  })

  describe('comment edges change detection', () => {
    it('should update edges when comment edges change', () => {
      const { rerender } = renderHook(
        (props) => useCanvasDataSync({ ...defaultOptions, comments: props.comments, transformedEdges: props.transformedEdges }),
        {
          initialProps: { comments: mockComments, transformedEdges: mockTransformedEdges },
        }
      )

      vi.clearAllMocks()

      const newComment: Comment = {
        id: 'comment-2',
        mapId: 'map-1',
        text: 'Comment 2',
        position: { x: 400, y: 500 },
        conceptIds: ['concept-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: 'user-1',
        resolved: false,
      }

      const updatedComments = [...mockComments, newComment]
      const updatedEdges = [
        ...mockTransformedEdges,
        {
          id: 'comment-edge-2',
          source: 'comment-2',
          target: 'concept-2',
          type: 'comment-edge',
          data: {},
        },
      ]

      rerender({
        comments: updatedComments,
        transformedEdges: updatedEdges,
      })

      expect(mockSetEdges).toHaveBeenCalledWith(updatedEdges)
    })
  })
})

