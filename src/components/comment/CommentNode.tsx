/**
 * Custom React Flow node component for Comment nodes.
 * 
 * Renders a comment as a yellow sticky note-style node on the canvas with inline editing capabilities.
 * Supports double-click to edit, handles for connections, and shows creator avatar on hover.
 * 
 * **Features:**
 * - Inline text editing (double-click to edit)
 * - Drag-and-drop positioning
 * - Connection handles (centered top/bottom)
 * - Creator avatar display on hover
 * - Permission-based editing (read-only for users without write access)
 * - Yellow sticky note appearance with curled corner
 * 
 * @param props - Node props from React Flow
 * @param props.data - Node data containing comment entity
 * @param props.selected - Whether the node is currently selected
 * @param props.id - Node ID (comment ID)
 * @returns The comment node JSX
 */

import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check } from 'lucide-react'
import { useCommentActions } from '@/hooks/useCommentActions'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { useUIStore } from '@/stores/uiStore'
import { getAvatarUrl } from '@/lib/avatar'
import type { Comment } from '@/lib/schema'
import { NodeToolbar } from '@/components/toolbar/NodeToolbar'

/**
 * Node data type for Comment nodes in React Flow.
 */
export interface CommentNodeData {
  /** The comment entity data */
  comment: Comment
  /** Flag to trigger edit mode when node is first created */
  shouldStartEditing?: boolean
}

/**
 * Generate initials from a user ID or email.
 */
function getInitials(userId: string): string {
  // Try to extract initials from email if it looks like an email
  if (userId.includes('@')) {
    const parts = userId.split('@')[0].split(/[._-]/)
    return parts
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  // Otherwise use first two characters of ID
  return userId.slice(0, 2).toUpperCase()
}

/**
 * Simple hash function to convert a string to a number.
 * Used to generate stable pseudo-random values from IDs.
 * Uses a better hash algorithm for better distribution.
 */
function hashString(str: string): number {
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash | 0 // Convert to 32-bit integer
  }
  // Use absolute value and ensure we have a good distribution
  return Math.abs(hash)
}

/**
 * Generate a stable angle offset (-15 to +15 degrees) based on a comment ID.
 * This ensures each comment's tape has a very noticeably different angle that remains consistent.
 */
function getTapeAngleOffset(commentId: string): number {
  const hash = hashString(commentId)
  // Use modulo to get a value 0-2999, then map to -15 to +15 range
  // This ensures good distribution across a much wider range for very visible variation
  const range = hash % 3000 // 0 to 2999
  const normalized = (range / 100) - 15 // -15 to +14.99
  // Round to 1 decimal place for cleaner values while maintaining variation
  return Math.round(normalized * 10) / 10
}

/**
 * Generate a stable length multiplier (0.8 to 1.2) based on a comment ID.
 * This ensures each comment's tape has a slightly different length that remains consistent.
 */
function getTapeLengthMultiplier(commentId: string): number {
  const hash = hashString(commentId + 'length') // Use different hash by appending 'length'
  // Use modulo to get a value 0-399, then map to 0.8 to 1.2 range
  const range = hash % 400 // 0 to 399
  const normalized = (range / 1000) + 0.8 // 0.8 to 1.199
  // Round to 2 decimal places for cleaner values
  return Math.round(normalized * 100) / 100
}

/**
 * Generate a stable position offset (-8 to +8 pixels) along the rotated axis based on a comment ID.
 * This ensures each comment's tape is positioned slightly differently along its rotation axis.
 */
function getTapePositionOffset(commentId: string): number {
  const hash = hashString(commentId + 'position') // Use different hash by appending 'position'
  // Use modulo to get a value 0-1599, then map to -8 to +8 range
  const range = hash % 1600 // 0 to 1599
  const normalized = (range / 100) - 8 // -8 to +7.99
  // Round to 1 decimal place
  return Math.round(normalized * 10) / 10
}

export const CommentNode = memo(({ data, selected, id: nodeId }: NodeProps<CommentNodeData>) => {
  const { updateComment } = useCommentActions()
  const { hasWriteAccess } = useMapPermissions()
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId)
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const setSelectedRelationshipId = useUIStore((state) => state.setSelectedRelationshipId)
  const selectedCommentId = useUIStore((state) => state.selectedCommentId)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(data.comment.text)
  const [isHovered, setIsHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasTriggeredEditRef = useRef(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  
  // Track dark mode state for theme-aware styling
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  )
  
  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  // Inject curled corner CSS with dark mode support
  useEffect(() => {
    const styleId = 'comment-node-curled-corner-styles'
    const existingStyle = document.getElementById(styleId)
    if (existingStyle) {
      existingStyle.remove()
    }

    // CSS for sticky note - the folded corner overlay is now a separate element
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .sticky-note {
        position: relative;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [isDarkMode])

  // Get creator avatar URL
  const creatorAvatarUrl = getAvatarUrl(
    data.comment.creatorEmail || null,
    data.comment.creatorImageURL || null,
    24
  )
  const creatorInitials = getInitials(data.comment.createdBy)

  // Update edit text when data changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditText(data.comment.text)
    }
  }, [data.comment.text, isEditing])

  // Reset the trigger ref when shouldStartEditing becomes false
  useEffect(() => {
    if (!data.shouldStartEditing) {
      hasTriggeredEditRef.current = false
    }
  }, [data.shouldStartEditing])

  // Trigger edit mode if shouldStartEditing flag is set (only once per flag cycle)
  useEffect(() => {
    if (data.shouldStartEditing && !isEditing && hasWriteAccess && !hasTriggeredEditRef.current) {
      hasTriggeredEditRef.current = true
      setIsEditing(true)
      setEditText(data.comment.text)
    }
  }, [data.shouldStartEditing, isEditing, hasWriteAccess, data.comment.text])

  // Focus textarea and set initial height when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          // Set initial height based on content
          textareaRef.current.style.height = 'auto'
          const scrollHeight = textareaRef.current.scrollHeight
          textareaRef.current.style.height = `${scrollHeight}px`
          textareaRef.current.focus()
          // Place cursor at end of text instead of selecting all
          const length = textareaRef.current.value.length
          textareaRef.current.setSelectionRange(length, length)
        }
      })
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    // Clear other selections
    setSelectedConceptId(null)
    setSelectedRelationshipId(null)
    // Set this comment as selected
    setSelectedCommentId(data.comment.id)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Disable inline editing if user doesn't have write access
    if (!hasWriteAccess) return
    
    setIsEditing(true)
    setEditText(data.comment.text)
  }

  const handleSave = async () => {
    if (!hasWriteAccess) {
      setIsEditing(false)
      return
    }
    
    const trimmedText = editText.trim()
    if (!trimmedText) {
      setEditText(data.comment.text) // Revert if empty
      setIsEditing(false)
      return
    }

    if (trimmedText !== data.comment.text) {
      try {
        await updateComment(data.comment.id, {
          text: trimmedText,
        })
      } catch (error) {
        console.error('Failed to update comment text:', error)
        setEditText(data.comment.text) // Revert on error
      }
    }
    
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditText(data.comment.text)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
    // Enter and Shift+Enter allow new lines in markdown
  }

  // Theme-aware sticky note colors
  // Dark mode: brighter yellow that works well with dark backgrounds
  // Light mode: bright yellow sticky note
  const stickyNoteColor = isDarkMode ? '#fbbf24' : '#ffeb3b' // Brighter yellow in dark mode (amber-400)
  const selectedStickyNoteColor = isDarkMode ? '#fcd34d' : '#fff59d' // Even brighter when selected (amber-300)
  const backgroundColor = selected ? selectedStickyNoteColor : stickyNoteColor
  
  // Generate stable angle offset, length multiplier, and position offset for tape based on comment ID
  const tapeAngleOffset = getTapeAngleOffset(data.comment.id)
  const tapeRotation = -45 + tapeAngleOffset // Base -45 degrees plus stable offset
  const tapeLengthMultiplier = getTapeLengthMultiplier(data.comment.id)
  const tapePositionOffset = getTapePositionOffset(data.comment.id)
  const baseTapeLength = 32 // Longer dimension (length)
  const baseTapeWidth = 16 // Shorter dimension (width) - stays constant
  const tapeLength = baseTapeLength * tapeLengthMultiplier // Vary length (longer dimension)
  const tapeWidth = baseTapeWidth // Keep width (shorter dimension) constant
  
  // Calculate position offset along the rotated axis
  // Convert rotation angle to radians for trigonometric calculations
  const rotationRad = (tapeRotation * Math.PI) / 180
  // Calculate x and y offsets along the rotated axis
  const offsetX = tapePositionOffset * Math.cos(rotationRad)
  const offsetY = tapePositionOffset * Math.sin(rotationRad)
  
  // Base position
  const baseTop = -2
  const baseLeft = -14
  // Apply offset along rotated axis
  const tapeTop = baseTop + offsetY
  const tapeLeft = baseLeft + offsetX
  
  // Debug: log the angle, length, and position for each comment
  console.log(`Comment ID: ${data.comment.id.substring(0, 8)}..., Angle: ${tapeRotation.toFixed(2)}°, Length: ${tapeLength.toFixed(1)}px, Position offset: ${tapePositionOffset.toFixed(2)}px`)

  return (
    <>
      <div
        ref={nodeRef}
        className={`relative group ${isEditing ? 'nodrag' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={(e) => {
          // Prevent node drag when editing
          if (isEditing) {
            e.stopPropagation()
          }
        }}
        onPointerDown={(e) => {
          // Prevent node drag when editing (React Flow uses pointer events)
          if (isEditing) {
            e.stopPropagation()
          }
        }}
      >
      {/* Resolved checkmark - positioned top-left outside the node */}
      {data.comment.resolved && (
        <div className="absolute -top-2 -left-2 z-20 flex items-center justify-center w-6 h-6 bg-green-500 rounded-full shadow-md">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
      {/* Centered target handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'transparent',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: 'none',
        }}
      />

      {/* Creator avatar on hover - positioned outside clipped container */}
      {isHovered && (creatorAvatarUrl || creatorInitials) && (
        <div className="absolute -top-2 -right-2 z-10">
          {creatorAvatarUrl ? (
            <img
              src={creatorAvatarUrl}
              alt="Creator"
              className="h-6 w-6 rounded-full border-2 border-white shadow-md"
              style={{ borderColor: '#f9a825' }}
            />
          ) : (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white shadow-md border-2"
              style={{
                backgroundColor: '#f9a825',
                borderColor: '#f9a825',
              }}
            >
              {creatorInitials}
            </div>
          )}
        </div>
      )}

      {/* Sticky note container */}
      <div
        className={`px-3 py-2 shadow-md transition-all hover:shadow-lg min-w-[120px] max-w-[200px] relative sticky-note ${isEditing ? 'cursor-text' : 'cursor-pointer'}`}
        style={{
          backgroundColor: backgroundColor,
          boxShadow: selected
            ? isDarkMode
              ? '0 4px 8px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(139, 105, 20, 0.5)'
              : '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(251, 192, 45, 0.3)'
            : isDarkMode
              ? '-2px 2px 4px rgba(0, 0, 0, 0.5)'
              : '-2px 2px 2px rgba(0, 0, 0, 0.3)',
        }}
        onMouseDown={(e) => {
          // Prevent node drag when editing
          if (isEditing) {
            e.stopPropagation()
          }
        }}
        onPointerDown={(e) => {
          // Prevent node drag when editing (React Flow uses pointer events)
          if (isEditing) {
            e.stopPropagation()
          }
        }}
      >
        {/* Translucent grey tape piece in top-left corner - short rectangle rotated slightly */}
        <div
          className="absolute z-[3] pointer-events-none"
          data-tape-rotation={tapeRotation}
          data-tape-length={tapeLengthMultiplier}
          style={{
            top: `${tapeTop}px`, // Position adjusted along rotated axis
            left: `${tapeLeft}px`, // Position adjusted along rotated axis
            width: `${tapeLength}px`, // Length is the longer dimension (varies)
            height: `${tapeWidth}px`, // Width is the shorter dimension (constant)
            // Translucent grey tape effect
            background: isDarkMode 
              ? 'rgba(156, 163, 175, 0.4)' // grey-400 with transparency
              : 'rgba(156, 163, 175, 0.3)', // grey-400 with transparency
            // Rotate -45 degrees plus stable offset based on comment ID
            transform: `rotate(${tapeRotation}deg)`,
            transformOrigin: 'center center', // Rotate around center
            // Rounded corners for tape appearance
            borderRadius: '2px',
            // Subtle shadow for tape depth
            boxShadow: isDarkMode
              ? '1px 1px 2px rgba(0, 0, 0, 0.3)'
              : '1px 1px 2px rgba(0, 0, 0, 0.2)',
          }}
        />
        {/* Comment text content */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value)
              // Auto-resize textarea as user types
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
              }
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => {
              // Prevent node drag when interacting with textarea
              e.stopPropagation()
            }}
            onMouseMove={(e) => {
              // Prevent node drag during text selection
              e.stopPropagation()
            }}
            onMouseUp={(e) => {
              // Prevent node drag after text selection
              e.stopPropagation()
            }}
            onPointerDown={(e) => {
              // Prevent node drag when interacting with textarea (React Flow uses pointer events)
              e.stopPropagation()
            }}
            onPointerMove={(e) => {
              // Prevent node drag during text selection
              e.stopPropagation()
            }}
            onPointerUp={(e) => {
              // Prevent node drag after text selection
              e.stopPropagation()
            }}
            className="w-full text-sm bg-transparent border-0 outline-none resize-none font-mono"
            style={{
              minHeight: '20px',
              fontFamily: 'inherit',
              color: '#111827', // Keep text black in both light and dark mode
              overflowY: 'hidden', // Hide scrollbar, let it grow naturally
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-sm prose prose-sm max-w-none text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.comment.text}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Centered source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'transparent',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: 'none',
        }}
      />
    </div>
    {selectedCommentId === data.comment.id && (
      <NodeToolbar
        nodeRef={nodeRef}
        visible={true}
        type="comment"
        comment={{
          id: data.comment.id,
          resolved: data.comment.resolved,
        }}
      />
    )}
    </>
  )
})

CommentNode.displayName = 'CommentNode'

