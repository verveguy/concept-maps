/**
 * Test setup file for Vitest.
 * Configures testing environment and global test utilities.
 */

import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})


