/**
 * Component for displaying and editing concept node notes.
 * 
 * Supports inline editing with auto-resize for both height and width.
 * Notes are rendered as Markdown when not editing.
 * 
 * **Auto-Resize:**
 * - Height: Automatically adjusts based on content (scrollHeight)
 * - Width: Measures longest line and adjusts width accordingly
 * 
 * @param notes - Current notes value (markdown)
 * @param isEditing - Whether notes are being edited
 * @param editNotes - Current edit value
 * @param onEditNotesChange - Handler to update edit value
 * @param onEdit - Handler to start editing
 * @param onSave - Handler to save edit
 * @param onCancel - Handler to cancel edit
 * @param onKeyDown - Keyboard event handler
 * @param textColor - Text color for notes display
 * @param hasWriteAccess - Whether user has write access
 * @param notesTextareaRef - Ref for the textarea element
 * @param notesDisplayRef - Ref for the display div element
 * @param notesMeasureRef - Ref for the measurement span element
 * @param notesDisplayHeight - Measured display height
 * @param notesDisplayWidth - Measured display width
 * @param shouldShow - Whether notes should be visible
 * 
 * @example
 * ```tsx
 * import { ConceptNodeNotes } from '@/components/concept/ConceptNodeNotes'
 * 
 * function ConceptNode({ concept, isEditingNotes, editNotes }) {
 *   return (
 *     <ConceptNodeNotes
 *       notes={concept.notes || ''}
 *       isEditing={isEditingNotes}
 *       editNotes={editNotes}
 *       onEditNotesChange={setEditNotes}
 *       onEdit={() => setIsEditingNotes(true)}
 *       onSave={handleSaveNotes}
 *       onCancel={handleCancelNotes}
 *       onKeyDown={handleNotesKeyDown}
 *       textColor={nodeStyle.textColor}
 *       hasWriteAccess={hasWriteAccess}
 *       notesTextareaRef={notesTextareaRef}
 *       notesDisplayRef={notesDisplayRef}
 *       notesMeasureRef={notesMeasureRef}
 *       notesDisplayHeight={notesDisplayHeight}
 *       notesDisplayWidth={notesDisplayWidth}
 *       shouldShow={shouldShowNotesAndMetadata}
 *     />
 *   )
 * }
 * ```
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

/**
 * Props for ConceptNodeNotes component
 */
export interface ConceptNodeNotesProps {
  /** Current notes value (markdown) */
  notes: string
  /** Whether notes are being edited */
  isEditing: boolean
  /** Current edit value */
  editNotes: string
  /** Handler to update edit value */
  onEditNotesChange: (value: string) => void
  /** Handler to start editing */
  onEdit: () => void
  /** Handler to save edit */
  onSave: () => void
  /** Keyboard event handler */
  onKeyDown: (e: React.KeyboardEvent) => void
  /** Text color for notes display */
  textColor: string
  /** Whether user has write access */
  hasWriteAccess: boolean
  /** Ref for the textarea element */
  notesTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** Ref for the display div element */
  notesDisplayRef: React.RefObject<HTMLDivElement | null>
  /** Ref for the measurement span element */
  notesMeasureRef: React.RefObject<HTMLSpanElement | null>
  /** Measured display height */
  notesDisplayHeight: number | null
  /** Measured display width */
  notesDisplayWidth: number | null
  /** Whether notes should be visible */
  shouldShow: boolean
}

/**
 * Component to render notes display/editing.
 * 
 * @param props - Component props
 * @returns Notes display/editing JSX
 */
export function ConceptNodeNotes({
  notes,
  isEditing,
  editNotes,
  onEditNotesChange,
  onEdit,
  onSave,
  onKeyDown,
  textColor,
  hasWriteAccess,
  notesTextareaRef,
  notesDisplayRef,
  notesMeasureRef,
  notesDisplayHeight,
  notesDisplayWidth,
  shouldShow,
}: ConceptNodeNotesProps) {
  // Handle textarea auto-resize
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onEditNotesChange(newValue)
    
    const textarea = e.target
    // Auto-resize height
    textarea.style.height = 'auto'
    const minHeight = notesDisplayHeight || 20
    const newHeight = Math.max(textarea.scrollHeight, minHeight)
    textarea.style.height = `${newHeight}px`
    
    // Auto-expand width based on content (measure longest line using hidden element)
    const minWidth = notesDisplayWidth || 100
    let maxLineWidth = minWidth
    if (notesMeasureRef.current) {
      // Split by newlines and measure each line
      const lines = e.target.value.split('\n')
      notesMeasureRef.current.style.fontSize = window.getComputedStyle(textarea).fontSize
      notesMeasureRef.current.style.fontFamily = window.getComputedStyle(textarea).fontFamily
      notesMeasureRef.current.style.fontWeight = window.getComputedStyle(textarea).fontWeight
      notesMeasureRef.current.style.letterSpacing = window.getComputedStyle(textarea).letterSpacing
      notesMeasureRef.current.style.whiteSpace = 'nowrap'
      notesMeasureRef.current.style.visibility = 'hidden'
      notesMeasureRef.current.style.position = 'absolute'
      notesMeasureRef.current.style.top = '-9999px'
      
      lines.forEach((line) => {
        notesMeasureRef.current!.textContent = line || ' '
        const lineWidth = notesMeasureRef.current!.offsetWidth
        maxLineWidth = Math.max(maxLineWidth, lineWidth)
      })
    }
    const newWidth = Math.max(maxLineWidth, minWidth)
    textarea.style.width = `${newWidth}px`
  }

  if (!shouldShow && !isEditing && !notes) {
    return null
  }

  return (
    <>
      {/* Hidden span for measuring text width */}
      {isEditing && (
        <span
          ref={notesMeasureRef}
          className="absolute invisible whitespace-nowrap"
          style={{ top: '-9999px', left: '-9999px' }}
        />
      )}
      
      {/* Notes section - editable inline */}
      {(shouldShow || isEditing) && (notes || isEditing) && (
        <div className={`mt-1 ${isEditing ? 'overflow-visible' : 'w-full overflow-hidden'}`}>
          {isEditing ? (
            <textarea
              ref={notesTextareaRef}
              value={editNotes}
              onChange={handleChange}
              onBlur={onSave}
              onKeyDown={onKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-xs bg-transparent resize-none outline-none border-0 p-0 m-0 block"
              style={{ 
                color: textColor,
                opacity: 0.7,
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'pre',
                wordBreak: 'normal',
                overflowWrap: 'normal',
                boxSizing: 'border-box',
                minWidth: notesDisplayWidth ? `${notesDisplayWidth}px` : '100%',
                width: notesDisplayWidth ? `${notesDisplayWidth}px` : '100%',
                overflowX: 'visible',
                overflowY: 'hidden',
              }}
              placeholder="Add notes (Markdown supported)..."
              disabled={!hasWriteAccess}
            />
          ) : (
            <div 
              ref={notesDisplayRef}
              className={`text-xs **:text-inherit [&_strong]:font-bold [&_em]:italic [&_code]:font-mono [&_a]:underline [&_p]:m-0 [&_p]:leading-normal ${hasWriteAccess ? 'cursor-text hover:opacity-100' : ''} transition-opacity w-full overflow-hidden`}
              style={{ color: textColor, opacity: 0.7, lineHeight: '1.5' }}
              onClick={(e) => {
                if (hasWriteAccess) {
                  e.stopPropagation()
                  onEdit()
                }
              }}
              title={hasWriteAccess ? "Click to edit notes" : undefined}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {notes}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </>
  )
}

