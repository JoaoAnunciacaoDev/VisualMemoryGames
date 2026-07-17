/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ITCH_CLIENT_ID: string
  // Adicionar outras variáveis de ambiente aqui se precisar
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}