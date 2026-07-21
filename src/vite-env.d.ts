/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" on the Azure SWA build to use the live REST API instead of mock data. */
  readonly VITE_USE_API?: string;
  /** Set to "functions" to use the linked Azure Functions `/api/*` backend. */
  readonly VITE_API_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
