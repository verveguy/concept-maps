/**
 * Tests for DeletePerspectiveDialog component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeletePerspectiveDialog } from '../DeletePerspectiveDialog'

describe('DeletePerspectiveDialog', () => {
  it('should not render when perspectiveToDelete is null', () => {
    render(
      <DeletePerspectiveDialog
        perspectiveToDelete={null}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByText('Delete Perspective')).not.toBeInTheDocument()
  })

  it('should render when perspectiveToDelete is set', () => {
    render(
      <DeletePerspectiveDialog
        perspectiveToDelete={{ id: 'perspective-1', name: 'Test Perspective', mapId: 'map-1' }}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Delete Perspective')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete "Test Perspective"/)).toBeInTheDocument()
  })

  it('should call onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <DeletePerspectiveDialog
        perspectiveToDelete={{ id: 'perspective-1', name: 'Test Perspective', mapId: 'map-1' }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    expect(onConfirm).toHaveBeenCalledWith('perspective-1')
  })

  it('should call onOpenChange with false when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <DeletePerspectiveDialog
        perspectiveToDelete={{ id: 'perspective-1', name: 'Test Perspective', mapId: 'map-1' }}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

