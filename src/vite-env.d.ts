/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTANTDB_APP_ID: string
  readonly VITE_INSTANTDB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
