import type { Concept, Relationship } from '@/lib/schema'

/**
 * Represents a Concept->Relationship->Concept triple in text format
 */
export interface TextTriple {
  fromConceptId: string
  fromConceptLabel: string
  relationshipId: string
  relationshipLabel: string
  toConceptId: string
  toConceptLabel: string
}

/**
 * Convert InstantDB concepts and relationships to structured text triples
 * Format: "Noun verb phrase Noun"
 */
export function conceptsToTriples(
  concepts: Concept[],
  relationships: Relationship[]
): TextTriple[] {
  // Create a map for quick concept lookup
  const conceptMap = new Map(concepts.map((c) => [c.id, c]))

  // Convert relationships to triples
  const triples: TextTriple[] = relationships
    .map((relationship) => {
      const fromConcept = conceptMap.get(relationship.fromConceptId)
      const toConcept = conceptMap.get(relationship.toConceptId)

      // Skip if either concept is missing (shouldn't happen, but safety check)
      if (!fromConcept || !toConcept) {
        return null
      }

      return {
        fromConceptId: relationship.fromConceptId,
        fromConceptLabel: fromConcept.label,
        relationshipId: relationship.id,
        relationshipLabel: relationship.primaryLabel,
        toConceptId: relationship.toConceptId,
        toConceptLabel: toConcept.label,
      }
    })
    .filter((triple): triple is TextTriple => triple !== null)

  // Sort triples alphabetically by from concept label, then relationship label
  triples.sort((a, b) => {
    const fromCompare = a.fromConceptLabel.localeCompare(b.fromConceptLabel)
    if (fromCompare !== 0) return fromCompare
    return a.relationshipLabel.localeCompare(b.relationshipLabel)
  })

  return triples
}

/**
 * Parse a text line into Noun, verb phrase, Noun components
 * Format: "Noun verb phrase Noun" where Nouns are title case
 * Examples:
 *   "Diagrams explain Architecture" → { from: "Diagrams", verb: "explain", to: "Architecture" }
 *   "Diagrams are drawn by Architects" → { from: "Diagrams", verb: "are drawn by", to: "Architects" }
 *   "Big Symbols are used for Big Concepts" → { from: "Big Symbols", verb: "are used for", to: "Big Concepts" }
 */
export function parseTripleText(text: string): { from: string; verb: string; to: string } | null {
  const words = text.trim().split(/\s+/)
  
  if (words.length < 3) {
    return null // Need at least Noun verb Noun
  }

  // Find the first Noun (words starting with uppercase)
  let fromStart = 0
  let fromEnd = 0
  
  // Find first word starting with uppercase
  for (let i = 0; i < words.length; i++) {
    if (words[i][0] && words[i][0] === words[i][0].toUpperCase()) {
      fromStart = i
      fromEnd = i
      // Continue while next word also starts with uppercase (multi-word noun)
      while (fromEnd + 1 < words.length && 
             words[fromEnd + 1][0] && 
             words[fromEnd + 1][0] === words[fromEnd + 1][0].toUpperCase()) {
        fromEnd++
      }
      break
    }
  }

  if (fromEnd === words.length - 1) {
    return null // Only found one noun
  }

  // Find the last Noun (words starting with uppercase, from the end)
  let toEnd = words.length - 1
  let toStart = words.length - 1

  // Find last word starting with uppercase
  for (let i = words.length - 1; i > fromEnd; i--) {
    if (words[i][0] && words[i][0] === words[i][0].toUpperCase()) {
      toEnd = i
      toStart = i
      // Continue backwards while previous word also starts with uppercase (multi-word noun)
      while (toStart > fromEnd + 1 && 
             words[toStart - 1][0] && 
             words[toStart - 1][0] === words[toStart - 1][0].toUpperCase()) {
        toStart--
      }
      break
    }
  }

  if (toStart <= fromEnd) {
    return null // No valid second noun found
  }

  // Extract the parts
  const from = words.slice(fromStart, fromEnd + 1).join(' ')
  const verb = words.slice(fromEnd + 1, toStart).join(' ')
  const to = words.slice(toStart, toEnd + 1).join(' ')

  if (!from || !verb || !to) {
    return null
  }

  return { from, verb, to }
}

/**
 * Format a triple as a text string
 * Format: "Noun verb phrase Noun"
 */
export function formatTripleText(from: string, verb: string, to: string): string {
  return `${from} ${verb} ${to}`
}

/**
 * Format a triple as a text string
 * Format: "Noun verb phrase Noun"
 */
export function formatTriple(triple: TextTriple): string {
  return formatTripleText(triple.fromConceptLabel, triple.relationshipLabel, triple.toConceptLabel)
}

/**
 * Find concepts that are not part of any relationship (orphan concepts)
 */
export function findOrphanConcepts(
  concepts: Concept[],
  relationships: Relationship[]
): Concept[] {
  const conceptIdsInRelationships = new Set<string>()
  
  relationships.forEach((rel) => {
    conceptIdsInRelationships.add(rel.fromConceptId)
    conceptIdsInRelationships.add(rel.toConceptId)
  })

  return concepts.filter((c) => !conceptIdsInRelationships.has(c.id))
}