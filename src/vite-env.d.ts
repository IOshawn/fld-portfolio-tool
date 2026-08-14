/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * "true" when the Azure build should use the Azure Functions /api/* backend.
   */
  readonly VITE_USE_API?: string;

}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
