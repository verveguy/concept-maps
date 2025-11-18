/**
 * Test setup file for Vitest.
 * Configures testing environment and global test utilities.
 */

import '@testing-library/jest-dom'
import { afterEach, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock InstantDB before any imports that use it
// This prevents InstantDB from trying to initialize IndexedDB in test environment
vi.mock('@/lib/instant', () => ({
  db: {
    useAuth: vi.fn(() => ({ user: null })),
    useQuery: vi.fn(() => ({ data: null })),
    transact: vi.fn().mockResolvedValue(undefined),
  },
  tx: {
    concepts: {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    relationships: {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comments: {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    shareInvitations: {},
    shares: {},
    maps: {},
  },
  id: vi.fn(() => 'mock-id'),
}))

// Suppress React act() warnings for Zustand store updates
// These are false positives - Zustand updates are synchronous but React Testing Library
// may not always recognize them as being within the act() boundary
const originalError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('An update to TestComponent inside a test was not wrapped in act(...)')
    ) {
      // Suppress act() warnings - these are false positives for Zustand store updates
      return
    }
    originalError.call(console, ...args)
  }
})

afterEach(() => {
  cleanup()
  // Restore original console.error
  console.error = originalError
})

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
globalThis.localStorage = localStorageMock as any


