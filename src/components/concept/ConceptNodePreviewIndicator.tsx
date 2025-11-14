/**
 * Component for preview indicator button on concept nodes.
 * 
 * Displays an info icon button that appears when notes/metadata are hidden.
 * Supports two interactions:
 * - Hover: Shows temporary preview after 1 second delay
 * - Click: Permanently shows notes/metadata
 * 
 * @param onClick - Handler for click (permanent expansion)
 * @param onMouseEnter - Handler for mouse enter (temporary preview)
 * @param hasWriteAccess - Whether user has write access
 * @param textColor - Text color for the icon
 * 
 * @example
 * ```tsx
 * import { ConceptNodePreviewIndicator } from '@/components/concept/ConceptNodePreviewIndicator'
 * 
 * function ConceptNode({ hasWriteAccess, textColor }) {
 *   return (
 *     <ConceptNodePreviewIndicator
 *       onClick={handleShowNotesAndMetadata}
 *       onMouseEnter={handlePreviewEnter}
 *       hasWriteAccess={hasWriteAccess}
 *       textColor={textColor}
 *     />
 *   )
 * }
 * ```
 */

import { Info } from 'lucide-react'

/**
 * Props for ConceptNodePreviewIndicator component
 */
export interface ConceptNodePreviewIndicatorProps {
  /** Handler for click (permanent expansion) */
  onClick: (e: React.MouseEvent) => void
  /** Handler for mouse enter (temporary preview) */
  onMouseEnter: (e: React.MouseEvent) => void
  /** Whether user has write access */
  hasWriteAccess: boolean
  /** Text color for the icon */
  textColor: string
}

/**
 * Component to render preview indicator button.
 * 
 * @param props - Component props
 * @returns Preview indicator button JSX
 */
export function ConceptNodePreviewIndicator({
  onClick,
  onMouseEnter,
  hasWriteAccess,
  textColor,
}: ConceptNodePreviewIndicatorProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="absolute p-1 rounded-full bg-accent hover:bg-accent/80 transition-colors"
      style={{
        bottom: '-3px',
        right: '-3px',
        zIndex: 10,
        cursor: hasWriteAccess ? 'pointer' : 'default',
        opacity: 0.8,
      }}
      title="Hover to preview or click to show notes and metadata"
      disabled={!hasWriteAccess}
    >
      <Info className="h-3 w-3" style={{ color: textColor, opacity: 0.7 }} strokeWidth={2} />
    </button>
  )
}

