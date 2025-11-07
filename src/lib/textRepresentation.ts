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
 * Strip line breaks from a relationship label for use in text contexts.
 * 
 * Replaces newlines with spaces and trims the result. This is used when
 * displaying relationship labels in text panels or other contexts where
 * line breaks should not be shown.
 * 
 * @param label - Relationship label that may contain line breaks
 * @returns Label with line breaks replaced by spaces and trimmed
 * 
 * @example
 * ```tsx
 * import { stripLineBreaks } from '@/lib/textRepresentation'
 * 
 * const label = "is used\nfor"
 * const text = stripLineBreaks(label)
 * // Returns: "is used for"
 * ```
 */
export function stripLineBreaks(label: string): string {
  return label.replace(/\n/g, ' ').trim()
}

/**
 * Convert InstantDB concepts and relationships to structured text triples.
 * 
 * Transforms the graph structure into a text-based representation where each
 * relationship becomes a triple in the format: "Noun verb phrase Noun".
 * 
 * **Format:**
 * Each triple represents a relationship as: `"[From Concept] [Relationship Label] [To Concept]"`
 * 
 * **Examples:**
 * - "Diagrams explain Architecture"
 * - "React is used for User Interfaces"
 * - "Components contain Props"
 * 
 * **Sorting:**
 * Triples are sorted alphabetically by from concept label, then by relationship label,
 * providing a consistent, readable order.
 * 
 * **Data Structure:**
 * Each triple includes:
 * - `fromConceptId` and `fromConceptLabel`: Source concept
 * - `relationshipId` and `relationshipLabel`: The relationship
 * - `toConceptId` and `toConceptLabel`: Target concept
 * 
 * @param concepts - Array of concepts to convert
 * @param relationships - Array of relationships to convert
 * @returns Array of text triples sorted alphabetically
 * 
 * @example
 * ```tsx
 * import { conceptsToTriples } from '@/lib/textRepresentation'
 * import { useConcepts, useRelationships } from '@/hooks'
 * 
 * function TextView() {
 *   const concepts = useConcepts()
 *   const relationships = useRelationships()
 *   const triples = conceptsToTriples(concepts, relationships)
 *   
 *   return (
 *     <div>
 *       {triples.map(triple => (
 *         <div key={triple.relationshipId}>
 *           {triple.fromConceptLabel} {triple.relationshipLabel} {triple.toConceptLabel}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
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
        relationshipLabel: stripLineBreaks(relationship.primaryLabel),
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
 * Parse a text line into Noun, verb phrase, Noun components.
 * 
 * Parses text in the format "Noun verb phrase Noun" where Nouns are identified
 * by title case (words starting with uppercase letters). The verb phrase is
 * everything between the two nouns.
 * 
 * **Format Rules:**
 * - Nouns: Words starting with uppercase letters (can be multi-word)
 * - Verb phrase: Everything between the nouns (lowercase words, articles, etc.)
 * - Must have at least 3 words total (Noun verb Noun minimum)
 * 
 * **Examples:**
 * - `"Diagrams explain Architecture"` → `{ from: "Diagrams", verb: "explain", to: "Architecture" }`
 * - `"Diagrams are drawn by Architects"` → `{ from: "Diagrams", verb: "are drawn by", to: "Architects" }`
 * - `"Big Symbols are used for Big Concepts"` → `{ from: "Big Symbols", verb: "are used for", to: "Big Concepts" }`
 * 
 * **Multi-word Nouns:**
 * The parser handles multi-word nouns by grouping consecutive uppercase words.
 * For example, "Big Symbols" is treated as a single noun.
 * 
 * @param text - Text string to parse (e.g., "Diagrams explain Architecture")
 * @returns Parsed triple with `from`, `verb`, and `to` properties, or `null` if parsing fails
 * 
 * @example
 * ```tsx
 * import { parseTripleText } from '@/lib/textRepresentation'
 * 
 * const parsed = parseTripleText("React is used for UI")
 * // Returns: { from: "React", verb: "is used for", to: "UI" }
 * 
 * const invalid = parseTripleText("not enough words")
 * // Returns: null
 * ```
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
 * Format a triple as a text string.
 * 
 * Combines the from concept, relationship label, and to concept into a
 * single text string in the format: "Noun verb phrase Noun".
 * 
 * @param from - Source concept label (Noun)
 * @param verb - Relationship label (verb phrase)
 * @param to - Target concept label (Noun)
 * @returns Formatted triple string
 * 
 * @example
 * ```tsx
 * import { formatTripleText } from '@/lib/textRepresentation'
 * 
 * const text = formatTripleText("React", "is used for", "UI")
 * // Returns: "React is used for UI"
 * ```
 */
export function formatTripleText(from: string, verb: string, to: string): string {
  return `${from} ${verb} ${to}`
}

/**
 * Format a TextTriple object as a text string.
 * 
 * Convenience function that formats a TextTriple object into the standard
 * "Noun verb phrase Noun" text format.
 * 
 * @param triple - TextTriple object to format
 * @returns Formatted triple string
 * 
 * @example
 * ```tsx
 * import { formatTriple } from '@/lib/textRepresentation'
 * 
 * const triple = {
 *   fromConceptLabel: "React",
 *   relationshipLabel: "is used for",
 *   toConceptLabel: "UI"
 * }
 * 
 * const text = formatTriple(triple)
 * // Returns: "React is used for UI"
 * ```
 */
export function formatTriple(triple: TextTriple): string {
  return formatTripleText(triple.fromConceptLabel, triple.relationshipLabel, triple.toConceptLabel)
}

/**
 * Find concepts that are not part of any relationship (orphan concepts).
 * 
 * Identifies concepts that exist in the map but have no relationships connecting
 * them to other concepts. These "orphan" concepts are isolated nodes in the graph.
 * 
 * **Use Cases:**
 * - Displaying unconnected concepts separately in the UI
 * - Identifying concepts that may need relationships added
 * - Providing visual feedback about graph completeness
 * 
 * @param concepts - Array of all concepts in the map
 * @param relationships - Array of all relationships in the map
 * @returns Array of concepts that have no relationships (orphan concepts)
 * 
 * @example
 * ```tsx
 * import { findOrphanConcepts } from '@/lib/textRepresentation'
 * import { useConcepts, useRelationships } from '@/hooks'
 * 
 * function ConceptMap() {
 *   const concepts = useConcepts()
 *   const relationships = useRelationships()
 *   const orphans = findOrphanConcepts(concepts, relationships)
 *   
 *   return (
 *     <div>
 *       <h2>Orphan Concepts ({orphans.length})</h2>
 *       {orphans.map(concept => (
 *         <div key={concept.id}>{concept.label}</div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
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