/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase web config as one JSON string. Public by design; optional. */
  readonly VITE_FIREBASE_CONFIG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
