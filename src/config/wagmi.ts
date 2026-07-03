import type { PublicClient } from 'viem'
import { http } from 'viem'
import { createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { getPublicClient } from 'wagmi/actions'
import { getDefaultConfig } from 'connectkit'

import { sepoliaRpcUrl } from 'packages/union/evm-chains'

// WalletConnect is intentionally out of scope: an empty projectId keeps
// ConnectKit from registering the WalletConnect connector at all, while
// injected EIP-6963 discovery (multiInjectedProviderDiscovery, on by
// default) still works.
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Gno.land Bridge',
    walletConnectProjectId: '',
    chains: [mainnet, sepolia],
    // Explicit so Sepolia keeps honoring VITE_ETH_RPC_URL (e.g. swapping to
    // Infura/Alchemy if the public node gets rate-limited) instead of
    // silently falling back to ConnectKit's default http() per chain.
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(sepoliaRpcUrl()),
    },
    // Only MetaMask is pinned (ConnectKit's own default also pins Coinbase
    // Wallet, which tries a hosted popup connection when the extension
    // isn't installed and just hangs). Keeping one fixed connector means
    // the wallet list is never empty, so ConnectKit never falls into its
    // "No connectors found in ConnectKit config." empty state at all -
    // everything else (Rabby, Keplr, etc.) still shows up automatically via
    // multiInjectedProviderDiscovery when actually installed.
    connectors: [injected({ target: 'metaMask' })],
  })
)

// Reads shouldn't depend on window.ethereum (whichever extension happens to
// own it) — wagmi's config transports are RPC-backed and independent of
// which EIP-6963 wallet the user picked to sign with.
export function getEvmPublicClient(chainId?: number): PublicClient {
  return (
    chainId
      ? getPublicClient(wagmiConfig, {
          chainId: chainId as (typeof wagmiConfig.chains)[number]['id'],
        })
      : getPublicClient(wagmiConfig)
  ) as PublicClient
}
