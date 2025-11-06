/**
 * Component for rendering peer presence cursors on the canvas.
 * Uses usePresenceCursors hook internally to track cursor positions.
 * This component will re-render when cursors move, but ConceptMapCanvasInner will not.
 * 
 * Must be rendered inside ReactFlowProvider context to access flowToScreenPosition.
 */

import { memo } from 'react'
import { useReactFlow } from 'reactflow'
import { usePresenceCursors } from '@/hooks/usePresenceCursors'
import { PresenceCursor } from '@/components/presence/PresenceCursor'

/**
 * Component for rendering peer presence cursors.
 * Extracted to prevent ConceptMapCanvasInner from re-rendering when cursors move.
 * Only this component will re-render when otherUsersPresence changes.
 */
export const PeerCursors = memo(() => {
  // Get cursor positions from the cursor-specific hook
  const { otherUsersPresence } = usePresenceCursors()
  
  // Get flowToScreenPosition from ReactFlow context
  const { flowToScreenPosition } = useReactFlow()
  
  return (
    <>
      {otherUsersPresence.map((presence) => (
        <PresenceCursor
          key={presence.userId}
          presence={presence}
          flowToScreenPosition={flowToScreenPosition}
        />
      ))}
    </>
  )
})
PeerCursors.displayName = 'PeerCursors'

