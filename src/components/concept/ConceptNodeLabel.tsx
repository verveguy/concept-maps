/**
 * Component for displaying and editing concept node labels.
 * 
 * Supports inline editing with auto-width adjustment. When editing,
 * the input width automatically adjusts to fit the text content.
 * 
 * @param label - Current label value
 * @param isEditing - Whether label is being edited
 * @param editLabel - Current edit value
 * @param onEdit - Handler to start editing
 * @param onSave - Handler to save edit
 * @param onCancel - Handler to cancel edit
 * @param onKeyDown - Keyboard event handler
 * @param textColor - Text color for label display
 * @param inputRef - Ref for the input element
 * @param measureRef - Ref for the measurement span element
 * 
 * @example
 * ```tsx
 * import { ConceptNodeLabel } from '@/components/concept/ConceptNodeLabel'
 * 
 * function ConceptNode({ concept, isEditing, editLabel }) {
 *   return (
 *     <ConceptNodeLabel
 *       label={concept.label}
 *       isEditing={isEditing}
 *       editLabel={editLabel}
 *       onEdit={() => setIsEditing(true)}
 *       onSave={handleSave}
 *       onCancel={handleCancel}
 *       onKeyDown={handleKeyDown}
 *       textColor={nodeStyle.textColor}
 *       inputRef={inputRef}
 *       measureRef={measureRef}
 *     />
 *   )
 * }
 * ```
 */


/**
 * Props for ConceptNodeLabel component
 */
export interface ConceptNodeLabelProps {
  /** Current label value */
  label: string
  /** Whether label is being edited */
  isEditing: boolean
  /** Current edit value */
  editLabel: string
  /** Handler to update edit value */
  onEditLabelChange: (value: string) => void
  /** Handler to save edit */
  onSave: () => void
  /** Keyboard event handler */
  onKeyDown: (e: React.KeyboardEvent) => void
  /** Text color for label display */
  textColor: string
  /** Ref for the input element */
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Ref for the measurement span element */
  measureRef: React.RefObject<HTMLSpanElement | null>
}

/**
 * Component to render label display/editing.
 * 
 * @param props - Component props
 * @returns Label display/editing JSX
 */
export function ConceptNodeLabel({
  label,
  isEditing,
  editLabel,
  onEditLabelChange,
  onSave,
  onKeyDown,
  textColor,
  inputRef,
  measureRef,
}: ConceptNodeLabelProps) {
  // Handle input width auto-resize
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onEditLabelChange(newValue)
    
    // Update input width based on measured text width
    if (measureRef.current && inputRef.current) {
      measureRef.current.textContent = newValue || label
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (measureRef.current && inputRef.current) {
          inputRef.current.style.width = `${Math.max(measureRef.current.offsetWidth, 20)}px`
        }
      })
    }
  }

  return (
    <div className="text-center">
      {isEditing ? (
        <>
          {/* Hidden span to measure text width - positioned off-screen but in normal flow */}
          <span
            ref={measureRef}
            className="font-semibold text-sm absolute whitespace-pre pointer-events-none"
            style={{ 
              color: textColor,
              visibility: 'hidden',
              position: 'absolute',
              top: '-9999px',
              left: '-9999px'
            }}
          >
            {editLabel || label}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={editLabel}
            onChange={handleChange}
            onBlur={onSave}
            onKeyDown={onKeyDown}
            className="inline-block font-semibold text-sm bg-transparent border-0 outline-none text-center"
            style={{ 
              color: textColor,
              minWidth: '1px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </>
      ) : (
        <div className="font-semibold text-sm inline-block" style={{ color: textColor }}>
          {label}
        </div>
      )}
    </div>
  )
}

