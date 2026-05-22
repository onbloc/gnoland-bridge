import { Chain } from 'viem'
import { base, mainnet, sepolia } from 'viem/chains'

import { BlockChainType } from 'types/network'

const SEPOLIA_RPC_FALLBACK = 'https://ethereum-sepolia-rpc.publicnode.com'

// Sepolia RPC for the gno-direct UNESCROW flow. Read from env so the user can
// swap in Infura / Alchemy if the public node is rate-limited.
export const sepoliaRpcUrl = (): string =>
  import.meta.env.VITE_ETH_RPC_URL || SEPOLIA_RPC_FALLBACK

// Pick the viem chain object that matches the current source plus the actual
// MetaMask network the user is connected to. Sepolia is honored when the
// connected chain id is 11155111 even though the bridge UI still labels the
// network as "Ethereum" - we don't expose Sepolia as a separate option.
export const pickEvmChain = (
  fromBlockChain: BlockChainType,
  walletChainId: number | undefined
): Chain => {
  if (fromBlockChain === BlockChainType.base) return base
  if (walletChainId === sepolia.id) return sepolia
  return mainnet
}

export const sepoliaChain = sepolia
