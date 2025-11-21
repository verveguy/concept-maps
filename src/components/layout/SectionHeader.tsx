/**
 * Reusable section header component for sidebar sections.
 * Displays section title with optional action button.
 */

import { memo } from 'react'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'

interface SectionHeaderProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  actionButton?: {
    onClick: (e: React.MouseEvent) => void
    disabled?: boolean
    title: string
  }
  /** Show a red notification dot when true */
  showNotificationDot?: boolean
}

export const SectionHeader = memo(({ title, isExpanded, onToggle, actionButton, showNotificationDot }: SectionHeaderProps) => {
  return (
    <div className="flex items-center">
      <button
        onClick={onToggle}
        className="flex-1 text-left px-3 py-2 hover:bg-accent transition-colors text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2 relative"
      >
        <span className="relative">
          {title}
          {showNotificationDot && (
            <span className="absolute -right-2 top-0 h-2 w-2 bg-red-500 rounded-full" />
          )}
        </span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {actionButton && (
        <IconButton
          onClick={actionButton.onClick}
          disabled={actionButton.disabled}
          title={actionButton.title}
          size="icon"
          className="p-2 hover:bg-accent transition-colors rounded disabled:opacity-50"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </IconButton>
      )}
    </div>
  )
})

SectionHeader.displayName = 'SectionHeader'

