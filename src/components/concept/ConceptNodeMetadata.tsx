/**
 * Component for displaying expandable metadata on concept nodes.
 * 
 * Shows metadata fields in an expandable section. Style attributes are filtered
 * out to avoid duplication (they're displayed separately as node styling).
 * 
 * @param metadata - Node metadata object
 * @param isExpanded - Whether metadata section is expanded
 * @param onToggleExpand - Handler to toggle expansion
 * @param textColor - Text color for metadata display
 * @param borderColor - Border color for separator
 * 
 * @example
 * ```tsx
 * import { ConceptNodeMetadata } from '@/components/concept/ConceptNodeMetadata'
 * 
 * function ConceptNode({ concept, isMetadataExpanded, setIsMetadataExpanded }) {
 *   return (
 *     <ConceptNodeMetadata
 *       metadata={concept.metadata}
 *       isExpanded={isMetadataExpanded}
 *       onToggleExpand={() => setIsMetadataExpanded(!isMetadataExpanded)}
 *       textColor={nodeStyle.textColor}
 *       borderColor={nodeStyle.borderColor}
 *     />
 *   )
 * }
 * ```
 */

import { ChevronDown, ChevronUp } from 'lucide-react'
import { getNonStyleMetadata } from '@/lib/nodeStyleUtils'

/**
 * Props for ConceptNodeMetadata component
 */
export interface ConceptNodeMetadataProps {
  /** Node metadata object */
  metadata: Record<string, unknown>
  /** Whether metadata section is expanded */
  isExpanded: boolean
  /** Handler to toggle expansion */
  onToggleExpand: () => void
  /** Text color for metadata display */
  textColor: string
  /** Border color for separator */
  borderColor: string
}

/**
 * Component to render expandable metadata display.
 * 
 * @param props - Component props
 * @returns Metadata display JSX
 */
export function ConceptNodeMetadata({
  metadata,
  isExpanded,
  onToggleExpand,
  textColor,
  borderColor,
}: ConceptNodeMetadataProps) {
  const nonStyleMetadata = getNonStyleMetadata(metadata || {})
  const metadataCount = Object.keys(nonStyleMetadata).length

  if (metadataCount === 0) {
    return null
  }

  return (
    <div className="mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand()
        }}
        className="flex items-center gap-1 text-xs transition-colors w-full"
        style={{ color: textColor, opacity: 0.6 }}
      >
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>
          {metadataCount} metadata field(s)
        </span>
      </button>
      {isExpanded && (
        <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor }}>
          {Object.entries(nonStyleMetadata)
            .filter(([key]) => key) // Filter out empty keys
            .map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="font-medium" style={{ color: textColor, opacity: 0.8 }}>
                  {key}:
                </span>{' '}
                <span style={{ color: textColor, opacity: 0.7 }}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

