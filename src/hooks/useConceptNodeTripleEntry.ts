/**
 * Hook for handling triple entry mode in concept nodes.
 * 
 * Triple entry mode allows users to enter text in the format "Noun verb phrase Noun"
 * to automatically create a relationship and second concept. This hook provides
 * functions to process triple text and create the necessary database entries.
 * 
 * **Triple Format:**
 * - Format: "Noun verb phrase Noun"
 * - Example: "React is used for UI" → creates concept "React", relationship "is used for", concept "UI"
 * - Nouns are identified by title case (words starting with uppercase)
 * - Verb phrase is everything between the nouns
 * 
 * **Behavior:**
 * - If "to" concept already exists, reuses it
 * - If "to" concept doesn't exist, creates it and applies incremental layout
 * - Sets shouldStartEditing flag on newly created concept
 * - Falls back to simple label update if triple parsing fails
 * 
 * @returns Function to process triple entry and create concepts/relationships
 * 
 * @example
 * ```tsx
 * import { useConceptNodeTripleEntry } from '@/hooks/useConceptNodeTripleEntry'
 * 
 * function ConceptNode({ concept, nodeId }) {
 *   const processTripleEntry = useConceptNodeTripleEntry()
 *   
 *   const handleSave = async (label) => {
 *     const result = await processTripleEntry({
 *       label,
 *       conceptId: concept.id,
 *       nodeId,
 *       currentLabel: concept.label,
 *     })
 *     if (result.success) {
 *       // Triple was processed
 *     }
 *   }
 * }
 * ```
 */

import { useCallback } from 'react'
import { useReactFlow } from 'reactflow'
import { db, tx, id } from '@/lib/instant'
import { parseTripleText, stripLineBreaks } from '@/lib/textRepresentation'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { useConcepts } from '@/hooks/useConcepts'
import { useMapStore } from '@/stores/mapStore'
import { useCanvasStore } from '@/stores/canvasStore'

/**
 * Parameters for processing triple entry
 */
export interface ProcessTripleEntryParams {
  /** The label text to parse (may be a triple) */
  label: string
  /** ID of the current concept being edited */
  conceptId: string
  /** React Flow node ID */
  nodeId: string
  /** Current label of the concept (before edit) */
  currentLabel: string
}

/**
 * Result of processing triple entry
 */
export interface ProcessTripleEntryResult {
  /** Whether triple was successfully processed */
  success: boolean
  /** Whether a new concept was created */
  createdNewConcept: boolean
  /** ID of the "to" concept (new or existing) */
  toConceptId?: string
  /** ID of the created relationship */
  relationshipId?: string
}

/**
 * Hook to process triple entry and create concepts/relationships.
 * 
 * @returns Function to process triple entry
 */
export function useConceptNodeTripleEntry() {
  const { getNode, getNodes, setNodes } = useReactFlow()
  const { updateConcept } = useCanvasMutations()
  const concepts = useConcepts()
  const currentMapId = useMapStore((state) => state.currentMapId)

  const processTripleEntry = useCallback(async (
    params: ProcessTripleEntryParams
  ): Promise<ProcessTripleEntryResult> => {
    const { label, conceptId, nodeId, currentLabel } = params
    
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      return { success: false, createdNewConcept: false }
    }

    // Check if the entered text matches the triple pattern "Noun verb phrase Noun"
    const parsed = parseTripleText(trimmedLabel)
    
    if (!parsed) {
      return { success: false, createdNewConcept: false }
    }

    // Triple pattern detected: update current concept, create relationship and new concept
    try {
      // Get current node position for positioning the new concept
      const currentNode = getNode(nodeId)
      if (!currentNode || !currentNode.position || !currentMapId) {
        // Fallback to simple update if we can't get position
        await updateConcept(conceptId, {
          label: trimmedLabel,
        })
        return { success: false, createdNewConcept: false }
      }

      // Estimate node width (same as in ConceptMapCanvas)
      const estimatedNodeWidth = 130
      
      // Calculate position for new concept (1.5 node widths to the right)
      const newPosition = {
        x: currentNode.position.x + estimatedNodeWidth * 1.5,
        y: currentNode.position.y, // Keep same Y position
      }

      // Check if the "to" concept already exists
      const existingToConcept = concepts.find((c) => c.label === parsed.to)
      const toConceptId = existingToConcept ? existingToConcept.id : id()
      const relationshipId = id()
      
      // Build transaction array
      const transactions: Parameters<typeof db.transact>[0] = []
      
      // Update current concept label to the first noun if changed
      if (parsed.from !== currentLabel) {
        transactions.push(
          tx.concepts[conceptId].update({
            label: parsed.from,
            updatedAt: Date.now(),
          })
        )
      }

      // Create the "to" concept if it doesn't exist
      // Set userPlaced: false since this will be positioned by layout algorithm
      const createdNewConcept = !existingToConcept
      if (createdNewConcept) {
        transactions.push(
          tx.concepts[toConceptId]
            .update({
              label: parsed.to,
              positionX: newPosition.x,
              positionY: newPosition.y,
              notes: '',
              metadata: JSON.stringify({}),
              userPlaced: false, // Layout algorithm will position this node
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({ map: currentMapId })
        )
      }

      // Create relationship between current concept and the "to" concept
      transactions.push(
        tx.relationships[relationshipId]
          .update({
            primaryLabel: stripLineBreaks(parsed.verb),
            reverseLabel: stripLineBreaks(parsed.verb),
            notes: '',
            metadata: JSON.stringify({}),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .link({
            map: currentMapId,
            fromConcept: conceptId,
            toConcept: toConceptId,
          })
      )

      // Execute all operations in a single transaction
      await db.transact(transactions)

      // If we created a new concept, apply incremental layout and set shouldStartEditing flag
      if (createdNewConcept) {
        // Get incremental layout function from store
        const applyIncrementalLayout = useCanvasStore.getState().applyIncrementalLayoutForNewNodes
        
        // Apply incremental layout if function is available and a layout is selected
        if (applyIncrementalLayout) {
          // Small delay to ensure the new node is fully created and edges are updated
          setTimeout(async () => {
            try {
              await applyIncrementalLayout(new Set([toConceptId]))
            } catch (error) {
              console.error('Failed to apply incremental layout for new concept:', error)
            }
          }, 150) // Delay to ensure node and edges are created
        }
        
        // Wait a bit for the node to appear in React Flow
        setTimeout(() => {
          const nodes = getNodes()
          const newNode = nodes.find((node) => node.id === toConceptId)
          if (newNode) {
            const updatedNodes = nodes.map((node) => {
              if (node.id === toConceptId) {
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
        }, 50) // Small delay to ensure React Flow has updated its internal state
      }

      return {
        success: true,
        createdNewConcept,
        toConceptId,
        relationshipId,
      }
    } catch (error) {
      console.error('Failed to process triple:', error)
      // Fallback to simple label update on error
      try {
        await updateConcept(conceptId, {
          label: trimmedLabel,
        })
      } catch (updateError) {
        console.error('Failed to update concept label:', updateError)
      }
      return { success: false, createdNewConcept: false }
    }
  }, [getNode, getNodes, setNodes, updateConcept, concepts, currentMapId])

  return processTripleEntry
}

