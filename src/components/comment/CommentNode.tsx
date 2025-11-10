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
import { useCommentActions } from '@/hooks/useCommentActions'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { getAvatarUrl } from '@/lib/avatar'
import type { Comment } from '@/lib/schema'

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

export const CommentNode = memo(({ data, selected, id: nodeId }: NodeProps<CommentNodeData>) => {
  const { updateComment } = useCommentActions()
  const { hasWriteAccess } = useMapPermissions()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(data.comment.text)
  const [isHovered, setIsHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasTriggeredEditRef = useRef(false)

  // Inject curled corner CSS
  useEffect(() => {
    const styleId = 'comment-node-curled-corner-styles'
    if (document.getElementById(styleId)) return // Already injected

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .sticky-note {
        position: relative;
      }
      .sticky-note:before,
      .sticky-note:after {
        content: '';
        display: block;
        position: absolute;
        width: 16px;
        height: 16px;
        top: 0;
        right: 0;
        z-index: 1;
      }
      .sticky-note:before {
        border-top: solid 8px #fff;
        border-right: solid 8px #fff;
        border-left: solid 8px transparent;
        border-bottom: solid 8px transparent;
      }
      .sticky-note:after {
        border-bottom: solid 8px #dddd33;
        border-left: solid 8px #dddd33;
        border-right: solid 8px transparent;
        border-top: solid 8px transparent;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

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

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      })
    }
  }, [isEditing])

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

  // Yellow sticky note color
  const stickyNoteColor = '#ffeb3b'
  const stickyNoteDark = '#fdd835'
  const selectedColor = selected ? '#fff59d' : stickyNoteColor

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
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

      {/* Sticky note container with curled corner */}
      <div
        className="px-3 py-2 shadow-md cursor-pointer transition-all hover:shadow-lg min-w-[120px] max-w-[200px] relative sticky-note"
        style={{
          backgroundColor: selectedColor,
          boxShadow: selected
            ? '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(251, 192, 45, 0.3)'
            : '-2px 2px 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Creator avatar on hover */}
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

        {/* Comment text content */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-transparent border-0 outline-none resize-none overflow-hidden font-mono"
            style={{
              minHeight: '20px',
              fontFamily: 'inherit',
              color: '#333',
            }}
            onClick={(e) => e.stopPropagation()}
            rows={1}
            onInput={(e) => {
              // Auto-resize textarea
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        ) : (
          <div className="text-sm text-gray-800 prose prose-sm max-w-none">
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
  )
})

CommentNode.displayName = 'CommentNode'

