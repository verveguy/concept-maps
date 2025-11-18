/**
 * Integration tests for Sidebar component.
 * Tests the refactored Sidebar with all its sections and dialogs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../Sidebar'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useSidebarData } from '@/hooks/useSidebarData'
import { useSidebarState } from '@/hooks/useSidebarState'
import { useSidebarActions } from '@/hooks/useSidebarActions'

// Mock dependencies
vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn(),
}))

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(),
}))

vi.mock('@/hooks/useSidebarData', () => ({
  useSidebarData: vi.fn(),
}))

vi.mock('@/hooks/useSidebarState', () => ({
  useSidebarState: vi.fn(),
}))

vi.mock('@/hooks/useSidebarActions', () => ({
  useSidebarActions: vi.fn(),
}))

vi.mock('../UserAvatarSection', () => ({
  UserAvatarSection: () => <div data-testid="user-avatar-section">User Avatar</div>,
}))

const mockUseAuth = vi.mocked(db.useAuth)
const mockUseQuery = vi.mocked(db.useQuery)
const mockUseMapStore = vi.mocked(useMapStore)
const mockUseUIStore = vi.mocked(useUIStore)
const mockUseSidebarData = vi.mocked(useSidebarData)
const mockUseSidebarState = vi.mocked(useSidebarState)
const mockUseSidebarActions = vi.mocked(useSidebarActions)

describe('Sidebar', () => {
  const mockUserId = 'user-1'
  const mockSetSidebarOpen = vi.fn()
  const mockSetCurrentMapId = vi.fn()
  const mockSetCurrentPerspectiveId = vi.fn()
  const mockSetNewlyCreatedMapId = vi.fn()
  const mockSetNewlyCreatedPerspectiveId = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock window.matchMedia for theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    mockUseAuth.mockReturnValue({
      user: { id: mockUserId },
    } as any)

    mockUseMapStore.mockReturnValue({
      currentMapId: null,
      currentPerspectiveId: null,
      setCurrentMapId: mockSetCurrentMapId,
      setCurrentPerspectiveId: mockSetCurrentPerspectiveId,
      setNewlyCreatedMapId: mockSetNewlyCreatedMapId,
      setNewlyCreatedPerspectiveId: mockSetNewlyCreatedPerspectiveId,
    } as any)

    mockUseUIStore.mockReturnValue({
      setSidebarOpen: mockSetSidebarOpen,
    } as any)

    // Mock all queries to return empty data by default
    mockUseQuery.mockReturnValue({ data: null } as any)

    // Mock sidebar hooks
    mockUseSidebarData.mockReturnValue({
      maps: [],
      folders: [],
      allPerspectives: [],
      ownedMaps: [],
      sharedMaps: [],
      folderMapIds: new Map(),
      mapsByFolder: new Map(),
    })

    mockUseSidebarState.mockReturnValue({
      expandedMaps: new Map([
        ['folders', new Set()],
        ['myMaps', new Set()],
        ['shared', new Set()],
      ]),
      setExpandedMaps: vi.fn(),
      expandedSections: new Set(['folders', 'myMaps', 'shared']),
      setExpandedSections: vi.fn(),
      expandedFolders: new Set(),
      setExpandedFolders: vi.fn(),
      mapToDelete: null,
      setMapToDelete: vi.fn(),
      perspectiveToDelete: null,
      setPerspectiveToDelete: vi.fn(),
      folderToDelete: null,
      setFolderToDelete: vi.fn(),
      isCreatingFolder: false,
      setIsCreatingFolder: vi.fn(),
      newFolderName: '',
      setNewFolderName: vi.fn(),
      isCreatingMap: false,
      setIsCreatingMap: vi.fn(),
      draggedMapId: null,
      setDraggedMapId: vi.fn(),
      dragOverFolderId: null,
      setDragOverFolderId: vi.fn(),
    })

    mockUseSidebarActions.mockReturnValue({
      handleCreateMap: vi.fn(),
      handleCreatePerspective: vi.fn(),
      handleCreateFolder: vi.fn(),
      handleCancelCreateFolder: vi.fn(),
      handleDeleteFolder: vi.fn(),
      handleSelectMap: vi.fn(),
      handleSelectPerspective: vi.fn(),
      handleDeleteMapClick: vi.fn(),
      handleConfirmDeleteMap: vi.fn(),
      handleDeletePerspectiveClick: vi.fn(),
      handleConfirmDeletePerspective: vi.fn(),
      handleDropMap: vi.fn(),
      handleDragStart: vi.fn(),
      handleDragEnd: vi.fn(),
    })
  })

  it('should render sidebar header', () => {
    render(<Sidebar />)

    expect(screen.getByText('Maps')).toBeInTheDocument()
    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument()
  })

  it('should call setSidebarOpen when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)

    const closeButton = screen.getByLabelText('Close sidebar')
    await user.click(closeButton)

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false)
  })

  it('should render empty state when no maps exist', () => {
    render(<Sidebar />)

    expect(screen.getByText(/No maps yet/)).toBeInTheDocument()
  })

  it('should render sections when maps exist', () => {
    const mockMap = {
      id: 'map-1',
      name: 'Map 1',
      createdBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
    mockUseSidebarData.mockReturnValue({
      maps: [mockMap],
      folders: [],
      allPerspectives: [],
      ownedMaps: [mockMap],
      sharedMaps: [],
      folderMapIds: new Map(),
      mapsByFolder: new Map(),
    })

    render(<Sidebar />)

    // Sections should be rendered (text is "Folders" and "My Maps" but styled with uppercase CSS)
    expect(screen.getByText('Folders')).toBeInTheDocument()
    expect(screen.getByText('My Maps')).toBeInTheDocument()
  })

  it('should render user avatar section', () => {
    render(<Sidebar />)

    expect(screen.getByTestId('user-avatar-section')).toBeInTheDocument()
  })

  it('should initialize theme from localStorage', async () => {
    // Mock localStorage.getItem to return 'dark'
    vi.mocked(globalThis.localStorage.getItem).mockReturnValue('dark')
    
    render(<Sidebar />)

    // Wait for useEffect to run
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
    
    expect(globalThis.localStorage.getItem).toHaveBeenCalledWith('theme')
  })

  it('should toggle theme when theme toggle is clicked', async () => {
    const user = userEvent.setup()
    // Mock localStorage to return null (no stored theme)
    vi.mocked(globalThis.localStorage.getItem).mockReturnValue(null)
    
    // Clear any existing dark class
    document.documentElement.classList.remove('dark')
    
    render(<Sidebar />)

    // Wait for initial render - should show "Dark Mode" button when in light mode
    await waitFor(() => {
      expect(screen.getByText(/dark mode/i)).toBeInTheDocument()
    })

    const themeButton = screen.getByText(/dark mode/i)
    await user.click(themeButton)

    // After clicking, should save 'dark' theme
    await waitFor(() => {
      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
    })
    
    // Should also add dark class to document
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

