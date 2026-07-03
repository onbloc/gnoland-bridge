import type { PublicClient } from 'viem'
import { http } from 'viem'
import { createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { getPublicClient } from 'wagmi/actions'
import { getDefaultConfig } from 'connectkit'

import { sepoliaRpcUrl } from 'packages/union/evm-chains'

// WalletConnect is intentionally out of scope: an empty projectId keeps
// ConnectKit from registering the WalletConnect connector at all, while
// injected EIP-6963 discovery (multiInjectedProviderDiscovery, on by
// default) and Coinbase Wallet still work.
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
    // Hides the "Continue with Aave" (formerly "Family") entry that
    // ConnectKit otherwise pins to the top of the wallet list.
    enableAaveAccount: false,
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
