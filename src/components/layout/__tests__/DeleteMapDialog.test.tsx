/**
 * Tests for DeleteMapDialog component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteMapDialog } from '../DeleteMapDialog'

describe('DeleteMapDialog', () => {
  it('should not render when mapToDelete is null', () => {
    render(
      <DeleteMapDialog
        mapToDelete={null}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByText('Delete Map')).not.toBeInTheDocument()
  })

  it('should render when mapToDelete is set', () => {
    render(
      <DeleteMapDialog
        mapToDelete={{ id: 'map-1', name: 'Test Map' }}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Delete Map')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete "Test Map"/)).toBeInTheDocument()
  })

  it('should call onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <DeleteMapDialog
        mapToDelete={{ id: 'map-1', name: 'Test Map' }}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    expect(onConfirm).toHaveBeenCalledWith('map-1')
  })

  it('should call onOpenChange with false when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <DeleteMapDialog
        mapToDelete={{ id: 'map-1', name: 'Test Map' }}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

