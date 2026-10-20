/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'api' | 'static'
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_GOOGLE_ALLOWED_EMAILS?: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const src: string
  export default src
}
