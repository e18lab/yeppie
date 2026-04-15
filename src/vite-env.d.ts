/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_LOGIN_ORIGIN?: string;
  readonly VITE_PANEL_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
