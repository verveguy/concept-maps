/**
 * PendingInvitationEntry component for rendering pending invitation items in the sidebar.
 * Displays invitations that the user can click to navigate to the map and accept/decline.
 */

import { memo } from 'react'
import { Mail } from 'lucide-react'
import type { ShareInvitation } from '@/lib/schema'

interface PendingInvitationEntryProps {
  invitation: ShareInvitation & { map?: { id: string; name: string; createdBy: string } }
  onSelectMap: (mapId: string) => void
}

export const PendingInvitationEntry = memo(({
  invitation,
  onSelectMap,
}: PendingInvitationEntryProps) => {
  const mapName = invitation.map?.name || 'Unknown Map'

  // Determine permission description
  const permissionText =
    invitation.permission === 'manage'
      ? 'Manage'
      : invitation.permission === 'edit'
        ? 'Edit'
        : 'View'

  return (
    <li>
      <div className="flex items-center">
        <div className="shrink-0 w-2"></div>
        <button
          onClick={() => {
            if (invitation.mapId) {
              onSelectMap(invitation.mapId)
            }
          }}
          className="flex-1 text-left px-1 py-2 hover:bg-accent transition-colors flex items-center gap-2"
          title={`Pending invitation for ${mapName} (${permissionText} access) - Click to view`}
        >
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium truncate">
                {mapName}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                ({permissionText})
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Pending invitation
            </div>
          </div>
        </button>
      </div>
    </li>
  )
})

PendingInvitationEntry.displayName = 'PendingInvitationEntry'

