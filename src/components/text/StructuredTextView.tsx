/**
 * StructuredTextView component - Text view for concept maps.
 * Displays Concept->Relationship->Concept triples as editable text.
 * Format: "Noun verb phrase Noun" (e.g., "Diagrams explain Architecture").
 * Both views read/write directly to InstantDB (no sync logic needed).
 */

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useConcepts } from '@/hooks/useConcepts'
import { useRelationships } from '@/hooks/useRelationships'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { useMapStore } from '@/stores/mapStore'
import {
  conceptsToTriples,
  findOrphanConcepts,
  parseTripleText,
  stripLineBreaks,
} from '@/lib/textRepresentation'
import { EditableTriple } from './EditableTriple'

/**
 * StructuredTextView component - Text view for concept maps.
 * 
 * Displays Concept->Relationship->Concept triples as editable text in the format:
 * "Noun verb phrase Noun" (e.g., "Diagrams explain Architecture").
 * 
 * **Features:**
 * - Displays all relationships as text triples
 * - Editable triples (inline editing)
 * - Add new triples via text input
 * - Shows orphan concepts (concepts with no relationships)
 * - Auto-creates concepts if they don't exist when adding triples
 * 
 * **Data Flow:**
 * Both graph and text views read/write directly to InstantDB. No sync logic
 * is needed - changes in one view are immediately reflected in the other via
 * real-time subscriptions.
 * 
 * **Triple Format:**
 * Each relationship is displayed as: `"[From Concept] [Relationship Label] [To Concept]"`
 * 
 * **Adding Triples:**
 * Users can add new triples by typing in the format "Noun verb phrase Noun".
 * The parser automatically:
 * - Creates concepts if they don't exist
 * - Creates the relationship
 * - Positions new concepts at default coordinates
 * 
 * @returns The structured text view JSX
 * 
 * @example
 * ```tsx
 * import { StructuredTextView } from '@/components/text/StructuredTextView'
 * 
 * function TextView() {
 *   return (
 *     <div className="h-full">
 *       <StructuredTextView />
 *     </div>
 *   )
 * }
 * ```
 */
export function StructuredTextView() {
  const concepts = useConcepts()
  const relationships = useRelationships()
  const currentMapId = useMapStore((state) => state.currentMapId)
  const { createConcept, createRelationship } = useCanvasMutations()

  const triples = conceptsToTriples(concepts, relationships)
  const orphanConcepts = findOrphanConcepts(concepts, relationships)

  const [showAddTriple, setShowAddTriple] = useState(false)
  const [newTripleText, setNewTripleText] = useState('')

  const handleAddTriple = useCallback(async () => {
    if (!currentMapId || !newTripleText.trim()) {
      return
    }

    const parsed = parseTripleText(newTripleText.trim())
    
    if (!parsed) {
      alert('Invalid format. Expected: "Noun verb phrase Noun" (e.g., "Diagrams explain Architecture")')
      return
    }

    try {
      // Find or create concepts
      let fromConcept = concepts.find((c) => c.label === parsed.from)
      let toConcept = concepts.find((c) => c.label === parsed.to)

      // Create concepts if they don't exist
      if (!fromConcept) {
        await createConcept({
          mapId: currentMapId,
          label: parsed.from,
          position: { x: 250, y: 250 },
          notes: '',
          metadata: {},
          userPlaced: false,
        })
        // Wait a bit for the concept to appear in the concepts array
        await new Promise(resolve => setTimeout(resolve, 100))
        fromConcept = concepts.find((c) => c.label === parsed.from)
        if (!fromConcept) {
          throw new Error('Failed to create from concept')
        }
      }

      if (!toConcept) {
        await createConcept({
          mapId: currentMapId,
          label: parsed.to,
          position: { x: 350, y: 350 },
          notes: '',
          metadata: {},
          userPlaced: false,
        })
        // Wait a bit for the concept to appear in the concepts array
        await new Promise(resolve => setTimeout(resolve, 100))
        toConcept = concepts.find((c) => c.label === parsed.to)
        if (!toConcept) {
          throw new Error('Failed to create to concept')
        }
      }

      // Create relationship
      // At this point, fromConcept and toConcept are guaranteed to be defined
      // because we either found them or created them above
      if (!fromConcept || !toConcept) {
        throw new Error('Failed to ensure concepts exist')
      }
      
      await createRelationship({
        mapId: currentMapId,
        fromConceptId: fromConcept.id,
        toConceptId: toConcept.id,
        primaryLabel: stripLineBreaks(parsed.verb),
        reverseLabel: stripLineBreaks(parsed.verb),
        notes: '',
        metadata: {},
      })

      // Reset form
      setNewTripleText('')
      setShowAddTriple(false)
    } catch (error) {
      console.error('Failed to add triple:', error)
      alert('Failed to add triple. Please try again.')
    }
  }, [
    currentMapId,
    concepts,
    newTripleText,
    createConcept,
    createRelationship,
  ])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">

          {/* Add Triple Form */}
          {showAddTriple ? (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTripleText}
                  onChange={(e) => setNewTripleText(e.target.value)}
                  placeholder="Noun verb phrase Noun (e.g., 'Diagrams explain Architecture')"
                  className="flex-1 px-3 py-2 border rounded-md"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTriple()
                    } else if (e.key === 'Escape') {
                      setShowAddTriple(false)
                      setNewTripleText('')
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddTriple(false)
                    setNewTripleText('')
                  }}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTriple}
                  disabled={!newTripleText.trim()}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Triple
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddTriple(true)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Triple
            </button>
          )}

          {/* Triples List */}
          {triples.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No relationships yet. Add your first triple above!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {triples.map((triple) => (
                <EditableTriple key={triple.relationshipId} triple={triple} onUpdate={() => {}} />
              ))}
            </div>
          )}

          {/* Orphan Concepts */}
          {orphanConcepts.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <h2 className="text-lg font-semibold mb-3">Orphan Concepts</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Concepts that are not part of any relationship:
              </p>
              <div className="space-y-1">
                {orphanConcepts.map((concept) => (
                  <div key={concept.id} className="p-2 text-sm">
                    {concept.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
