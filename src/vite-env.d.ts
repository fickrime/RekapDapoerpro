/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_TOKEN?: string;
  readonly VITE_GAS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
