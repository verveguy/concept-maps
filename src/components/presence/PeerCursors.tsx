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
 * Component for rendering peer presence cursors on the canvas.
 * 
 * Extracted as a separate component to prevent ConceptMapCanvasInner from
 * re-rendering when cursors move. Only this component will re-render when
 * `otherUsersPresence` changes, improving performance.
 * 
 * **Performance Optimization:**
 * By separating cursor rendering from the main canvas component, we ensure
 * that cursor movements don't trigger expensive re-renders of the entire
 * concept map visualization.
 * 
 * **Requirements:**
 * Must be rendered inside ReactFlowProvider context to access `flowToScreenPosition`
 * from React Flow's context.
 * 
 * @returns Fragment containing all peer cursor components
 * 
 * @example
 * ```tsx
 * import { PeerCursors } from '@/components/presence/PeerCursors'
 * import { ReactFlowProvider } from 'reactflow'
 * 
 * function ConceptMap() {
 *   return (
 *     <ReactFlowProvider>
 *       <ConceptMapCanvasInner />
 *       <PeerCursors />
 *     </ReactFlowProvider>
 *   )
 * }
 * ```
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

