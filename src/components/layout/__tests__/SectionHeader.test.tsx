/**
 * Tests for SectionHeader component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionHeader } from '../SectionHeader'

describe('SectionHeader', () => {
  it('should render section title', () => {
    render(
      <SectionHeader
        title="My Maps"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByText('My Maps')).toBeInTheDocument()
  })

  it('should call onToggle when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <SectionHeader
        title="Folders"
        isExpanded={false}
        onToggle={onToggle}
      />
    )

    await user.click(screen.getByText('Folders'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('should render action button when provided', () => {
    const onActionClick = vi.fn()

    render(
      <SectionHeader
        title="My Maps"
        isExpanded={true}
        onToggle={vi.fn()}
        actionButton={{
          onClick: onActionClick,
          title: 'Create Map',
        }}
      />
    )

    const button = screen.getByTitle('Create Map')
    expect(button).toBeInTheDocument()
  })

  it('should not render action button when not provided', () => {
    render(
      <SectionHeader
        title="My Maps"
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument()
  })

  it('should call action button onClick when clicked', async () => {
    const user = userEvent.setup()
    const onActionClick = vi.fn()

    render(
      <SectionHeader
        title="My Maps"
        isExpanded={true}
        onToggle={vi.fn()}
        actionButton={{
          onClick: onActionClick,
          title: 'Create Map',
        }}
      />
    )

    await user.click(screen.getByTitle('Create Map'))
    expect(onActionClick).toHaveBeenCalledTimes(1)
  })

  it('should disable action button when disabled prop is true', () => {
    render(
      <SectionHeader
        title="My Maps"
        isExpanded={true}
        onToggle={vi.fn()}
        actionButton={{
          onClick: vi.fn(),
          disabled: true,
          title: 'Create Map',
        }}
      />
    )

    const button = screen.getByTitle('Create Map')
    expect(button).toBeDisabled()
  })
})

