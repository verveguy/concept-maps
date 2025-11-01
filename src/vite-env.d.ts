/**
 * Vite environment type definitions.
 * Provides TypeScript types for Vite-specific environment variables.
 */

/// <reference types="vite/client" />

/**
 * Environment variables interface for Vite.
 * These variables are available at build time via import.meta.env.
 */
interface ImportMetaEnv {
  /** InstantDB application ID */
  readonly VITE_INSTANTDB_APP_ID: string
  /** InstantDB API key */
  readonly VITE_INSTANTDB_API_KEY: string
}

/**
 * ImportMeta interface extension.
 * Provides access to environment variables via import.meta.env.
 */
interface ImportMeta {
  /** Environment variables */
  readonly env: ImportMetaEnv
}
