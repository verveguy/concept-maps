/**
 * Application layout component.
 * Provides the main application shell with sidebar and content area.
 */

import { useUIStore } from '@/stores/uiStore'
import { Sidebar } from './Sidebar'

/**
 * Application layout component.
 * 
 * Provides the main application shell with a collapsible sidebar and main content area.
 * The sidebar can be toggled open/closed, and the layout adapts responsively.
 * 
 * **Layout Structure:**
 * - Sidebar: Collapsible navigation panel (left side)
 * - Main Content: Scrollable content area (right side)
 * 
 * **Sidebar Behavior:**
 * - Can be toggled open/closed via UI state
 * - Smooth transitions when opening/closing
 * - Width: 256px (w-64) when open, 0px when closed
 * 
 * @param props - Component props
 * @param props.children - React children to render in the main content area
 * @returns The application layout JSX
 * 
 * @example
 * ```tsx
 * import { AppLayout } from '@/components/layout/AppLayout'
 * 
 * function App() {
 *   return (
 *     <AppLayout>
 *       <ConceptMapCanvas />
 *     </AppLayout>
 *   )
 * }
 * ```
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 border-r bg-card overflow-hidden`}
      >
        {sidebarOpen && <Sidebar />}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
