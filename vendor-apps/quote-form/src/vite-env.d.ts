/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_EMAIL_SERVICE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}