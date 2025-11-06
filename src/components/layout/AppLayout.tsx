/**
 * Application layout component.
 * Provides the main application shell with sidebar and content area.
 */

import { PanelLeft } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { Sidebar } from './Sidebar'

/**
 * Application layout component.
 * Renders a collapsible sidebar and main content area.
 * 
 * @param children - React children to render in the main content area
 * @returns The application layout JSX
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)

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
