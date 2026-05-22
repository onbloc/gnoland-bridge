// Mirror of Adena's default Gno.land chain registry. Source:
// /Users/heesung/adena-wallet/packages/adena-extension/src/resources/chains/chains.json
// Used to resolve which RPC to hit based on the chainId the wallet reports.
export type GnoNetwork = {
  chainId: string
  name: string
  rpc: string
  // gnoscan covers mainnet; testnets currently have no first-party explorer.
  explorer?: string
}

export const GNO_NETWORKS: Record<string, GnoNetwork> = {
  gnoland1: {
    chainId: 'gnoland1',
    name: 'Beta Mainnet',
    rpc: 'https://rpc.betanet.testnets.gno.land:443',
    explorer: 'https://gnoscan.io',
  },
  staging: {
    chainId: 'staging',
    name: 'Staging',
    rpc: 'https://rpc.staging.gno.land:443',
  },
  test13: {
    chainId: 'test13',
    name: 'Testnet 13',
    rpc: 'https://rpc.test13.testnets.gno.land:443',
  },
  dev: {
    chainId: 'dev',
    name: 'Local',
    // Same-origin proxy path. The Vercel rewrite (vercel.json) and the
    // Vite dev proxy (vite.config.ts) both forward this to the gno-ibc
    // devnet, sidestepping the mixed-content block that hits when an
    // HTTPS page tries to fetch a plain-HTTP RPC.
    rpc: '/gno-rpc',
  },
  'dev.gnoswap': {
    chainId: 'dev.gnoswap',
    name: 'GnoSwap Dev',
    rpc: 'https://dev.rpc.gnoswap.io',
  },
}

export const DEFAULT_GNO_NETWORK = GNO_NETWORKS.gnoland1

export const resolveGnoNetwork = (chainId?: string): GnoNetwork | undefined =>
  chainId ? GNO_NETWORKS[chainId] : undefined
