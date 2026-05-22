/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GNO_DIRECT_ZKGM?: 'true' | 'false'
  readonly VITE_GNO_RPC_URL?: string
  readonly VITE_GNO_CHAIN_ID?: string
  readonly VITE_GNO_TO_ETH_CHANNEL_ID?: string
  readonly VITE_GNO_TO_BASE_CHANNEL_ID?: string
  readonly VITE_UNION_TO_GNO_CHANNEL_ID?: string
  readonly VITE_GNO_EXPLORER_RPC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: any
  adena?: any
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}
