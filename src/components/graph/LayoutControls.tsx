/**
 * LayoutControls component - UI for selecting and applying layout algorithms.
 * Provides buttons for applying different layout types to the concept map.
 */

import { Layout } from 'lucide-react'
import type { LayoutType } from '@/lib/layouts'

/**
 * Props for LayoutControls component.
 */
interface LayoutControlsProps {
  /** Callback when a layout is selected */
  onApplyLayout: (layoutType: LayoutType) => void
  /** Whether controls are disabled */
  disabled?: boolean
}

/**
 * LayoutControls component - UI for selecting and applying layout algorithms.
 * 
 * @param onApplyLayout - Callback when a layout is selected
 * @param disabled - Whether controls are disabled (default: false)
 * @returns The layout controls JSX
 */
export function LayoutControls({ onApplyLayout, disabled = false }: LayoutControlsProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded-md shadow-sm">
      <Layout className="h-4 w-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">Layout:</span>
      <div className="flex gap-2">
        <button
          onClick={() => onApplyLayout('force-directed')}
          disabled={disabled}
          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Force-directed layout (spreads nodes evenly)"
        >
          Force-Directed
        </button>
        <button
          onClick={() => onApplyLayout('hierarchical')}
          disabled={disabled}
          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Hierarchical layout (top-to-bottom tree)"
        >
          Hierarchical
        </button>
      </div>
    </div>
  )
}

