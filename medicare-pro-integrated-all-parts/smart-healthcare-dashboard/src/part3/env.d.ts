/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Part 3 API. Defaults to "/api/part3" (proxied by the Vite dev server). */
  readonly VITE_PART3_API_BASE_URL?: string;
}
