/**
 * Tests for DeleteFolderDialog component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteFolderDialog } from '../DeleteFolderDialog'

describe('DeleteFolderDialog', () => {
  it('should not render when folderToDelete is null', () => {
    render(
      <DeleteFolderDialog
        folderToDelete={null}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByText('Delete Folder')).not.toBeInTheDocument()
  })

  it('should render when folderToDelete is set', () => {
    render(
      <DeleteFolderDialog
        folderToDelete={{ id: 'folder-1', name: 'Test Folder' }}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Delete Folder')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete "Test Folder"/)).toBeInTheDocument()
    expect(screen.getByText(/Maps in this folder will not be deleted/)).toBeInTheDocument()
  })

  it('should call onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <DeleteFolderDialog
        folderToDelete={{ id: 'folder-1', name: 'Test Folder' }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    expect(onConfirm).toHaveBeenCalledWith('folder-1')
  })

  it('should call onOpenChange with false when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <DeleteFolderDialog
        folderToDelete={{ id: 'folder-1', name: 'Test Folder' }}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

