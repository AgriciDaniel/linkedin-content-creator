/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_SERVER_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_FIRECRAWL_API_KEY?: string;
  // Add more environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
