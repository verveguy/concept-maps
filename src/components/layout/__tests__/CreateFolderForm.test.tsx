/**
 * Tests for CreateFolderForm component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateFolderForm } from '../CreateFolderForm'

describe('CreateFolderForm', () => {
  it('should render form with input and buttons', () => {
    render(
      <CreateFolderForm
        folderName=""
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByPlaceholderText('Folder name...')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should display folder name in input', () => {
    render(
      <CreateFolderForm
        folderName="New Folder"
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Folder name...') as HTMLInputElement
    expect(input.value).toBe('New Folder')
  })

  it('should call onFolderNameChange when input changes', async () => {
    const user = userEvent.setup()
    const onFolderNameChange = vi.fn()

    render(
      <CreateFolderForm
        folderName=""
        onFolderNameChange={onFolderNameChange}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Folder name...')
    await user.type(input, 'Test Folder')

    expect(onFolderNameChange).toHaveBeenCalled()
  })

  it('should call onSubmit when form is submitted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((e) => e.preventDefault())

    render(
      <CreateFolderForm
        folderName="New Folder"
        onFolderNameChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )

    await user.click(screen.getByText('Create'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <CreateFolderForm
        folderName="New Folder"
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should disable create button when folder name is empty', () => {
    render(
      <CreateFolderForm
        folderName=""
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const createButton = screen.getByText('Create')
    expect(createButton).toBeDisabled()
  })

  it('should disable create button when folder name is only whitespace', () => {
    render(
      <CreateFolderForm
        folderName="   "
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const createButton = screen.getByText('Create')
    expect(createButton).toBeDisabled()
  })

  it('should enable create button when folder name has content', () => {
    render(
      <CreateFolderForm
        folderName="Valid Folder"
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const createButton = screen.getByText('Create')
    expect(createButton).not.toBeDisabled()
  })

  it('should call onCancel when input loses focus and is empty', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <CreateFolderForm
        folderName=""
        onFolderNameChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    )

    const input = screen.getByPlaceholderText('Folder name...')
    input.focus()
    await user.tab() // Blur the input

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

