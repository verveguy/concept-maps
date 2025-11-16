/**
 * Hook for managing concept node editing state (label and notes).
 * 
 * Handles inline editing state for both label and notes, including:
 * - Auto-edit trigger (shouldStartEditing flag)
 * - Input width auto-resize for label editing
 * - Textarea height/width auto-resize for notes editing
 * - State synchronization with external data changes
 * 
 * **Auto-Edit Trigger:**
 * When `shouldStartEditing` is set to true, automatically enters edit mode
 * (useful for newly created nodes).
 * 
 * **Auto-Resize:**
 * - Label input: Automatically adjusts width based on text content
 * - Notes textarea: Automatically adjusts height and width based on content
 * 
 * @param initialLabel - Initial label value
 * @param initialNotes - Initial notes value
 * @param shouldStartEditing - Flag to trigger edit mode automatically
 * @param hasWriteAccess - Whether user has write access
 * @returns Editing state, handlers, and refs
 * 
 * @example
 * ```tsx
 * import { useConceptNodeEditing } from '@/hooks/useConceptNodeEditing'
 * 
 * function ConceptNode({ concept, shouldStartEditing }) {
 *   const {
 *     isEditing,
 *     editLabel,
 *     setEditLabel,
 *     isEditingNotes,
 *     editNotes,
 *     setEditNotes,
 *     inputRef,
 *     notesTextareaRef,
 *     measureRef,
 *     notesDisplayRef,
 *     notesMeasureRef,
 *     notesDisplayHeight,
 *     notesDisplayWidth,
 *   } = useConceptNodeEditing(
 *     concept.label,
 *     concept.notes || '',
 *     shouldStartEditing,
 *     hasWriteAccess
 *   )
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react'

/**
 * Return type for useConceptNodeEditing hook
 */
export interface UseConceptNodeEditingReturn {
  // Label editing state
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  editLabel: string
  setEditLabel: (value: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  measureRef: React.RefObject<HTMLSpanElement | null>
  
  // Notes editing state
  isEditingNotes: boolean
  setIsEditingNotes: (value: boolean) => void
  editNotes: string
  setEditNotes: (value: string) => void
  notesTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  notesDisplayRef: React.RefObject<HTMLDivElement | null>
  notesMeasureRef: React.RefObject<HTMLSpanElement | null>
  notesDisplayHeight: number | null
  notesDisplayWidth: number | null
}

/**
 * Hook to manage concept node editing state.
 * 
 * @param initialLabel - Initial label value
 * @param initialNotes - Initial notes value
 * @param shouldStartEditing - Flag to trigger edit mode automatically
 * @param hasWriteAccess - Whether user has write access
 * @returns Editing state, handlers, and refs
 */
export function useConceptNodeEditing(
  initialLabel: string,
  initialNotes: string,
  shouldStartEditing: boolean,
  hasWriteAccess: boolean
): UseConceptNodeEditingReturn {
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(initialLabel)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotes, setEditNotes] = useState(initialNotes)
  const [notesDisplayHeight, setNotesDisplayHeight] = useState<number | null>(null)
  const [notesDisplayWidth, setNotesDisplayWidth] = useState<number | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null)
  const notesDisplayRef = useRef<HTMLDivElement>(null)
  const notesMeasureRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const hasTriggeredEditRef = useRef(false)
  // Track the label value when editing starts to prevent reactive updates from interfering
  const editingStartLabelRef = useRef<string | null>(null)

  // Track when editing state changes to capture initial label
  const prevIsEditingRef = useRef(isEditing)
  
  // Update edit label when data changes (but not while editing)
  // When editing, ignore changes to initialLabel to prevent reactive database updates from interfering
  useEffect(() => {
    const wasEditing = prevIsEditingRef.current
    const isNowEditing = isEditing
    
    if (!isNowEditing) {
      // Not editing: sync editLabel with initialLabel
      setEditLabel(initialLabel)
      editingStartLabelRef.current = null // Clear the ref when not editing
    } else if (!wasEditing && isNowEditing) {
      // Just started editing: capture the initial label value
      editingStartLabelRef.current = initialLabel
      // Ensure editLabel is set to the current initialLabel when editing starts
      setEditLabel(initialLabel)
    }
    // While editing (wasEditing && isNowEditing), ignore changes to initialLabel
    // This prevents reactive database updates from interfering with user input
    
    prevIsEditingRef.current = isNowEditing
  }, [initialLabel, isEditing])

  // Update edit notes when data changes (but not while editing)
  useEffect(() => {
    if (!isEditingNotes) {
      setEditNotes(initialNotes)
    }
  }, [initialNotes, isEditingNotes])

  // Reset the trigger ref when shouldStartEditing becomes false
  useEffect(() => {
    if (!shouldStartEditing) {
      hasTriggeredEditRef.current = false
    }
  }, [shouldStartEditing])

  // Trigger edit mode if shouldStartEditing flag is set (only once per flag cycle)
  useEffect(() => {
    if (shouldStartEditing && !isEditing && hasWriteAccess && !hasTriggeredEditRef.current) {
      hasTriggeredEditRef.current = true
      setIsEditing(true)
      setEditLabel(initialLabel)
    }
  }, [shouldStartEditing, isEditing, hasWriteAccess, initialLabel])

  // Focus input and set initial width when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current && measureRef.current) {
      // Set the measure span text to current label
      measureRef.current.textContent = editLabel || initialLabel
      // Use requestAnimationFrame to ensure DOM has updated before measuring
      requestAnimationFrame(() => {
        if (measureRef.current && inputRef.current) {
          inputRef.current.style.width = `${Math.max(measureRef.current.offsetWidth, 20)}px`
          inputRef.current.focus()
          inputRef.current.select()
        }
      })
    }
  }, [isEditing, editLabel, initialLabel])

  // Measure display height and width when it's rendered (before editing starts)
  useEffect(() => {
    if (!isEditingNotes && notesDisplayRef.current && initialNotes) {
      const element = notesDisplayRef.current
      // Use scrollHeight to get full content height
      const height = element.scrollHeight || element.offsetHeight
      // Measure width to constrain textarea
      const width = element.offsetWidth || element.clientWidth
      setNotesDisplayHeight(height)
      setNotesDisplayWidth(width)
    } else if (!initialNotes) {
      // Reset measurements when notes are cleared
      setNotesDisplayHeight(null)
      setNotesDisplayWidth(null)
    }
  }, [initialNotes, isEditingNotes])

  // Focus textarea and set initial height when notes editing starts
  useEffect(() => {
    if (isEditingNotes && notesTextareaRef.current) {
      requestAnimationFrame(() => {
        if (notesTextareaRef.current) {
          // Let textarea find its natural height based on content
          notesTextareaRef.current.style.height = 'auto'
          const naturalHeight = notesTextareaRef.current.scrollHeight
          const minHeight = notesDisplayHeight || 20 // Use measured height as minimum
          notesTextareaRef.current.style.height = `${Math.max(naturalHeight, minHeight)}px`
          notesTextareaRef.current.focus()
          // Select all text for easy replacement
          notesTextareaRef.current.select()
        }
      })
    }
  }, [isEditingNotes, notesDisplayHeight])

  // Auto-resize textarea as user types
  useEffect(() => {
    if (isEditingNotes && notesTextareaRef.current) {
      const textarea = notesTextareaRef.current
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto'
      // Set height based on scrollHeight (content height), but don't shrink below initial height
      const minHeight = notesDisplayHeight || 20
      const newHeight = Math.max(textarea.scrollHeight, minHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [editNotes, isEditingNotes, notesDisplayHeight])

  return {
    isEditing,
    setIsEditing,
    editLabel,
    setEditLabel,
    inputRef,
    measureRef,
    isEditingNotes,
    setIsEditingNotes,
    editNotes,
    setEditNotes,
    notesTextareaRef,
    notesDisplayRef,
    notesMeasureRef,
    notesDisplayHeight,
    notesDisplayWidth,
  }
}

