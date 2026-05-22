export enum BlockChainType {
  gnoland = 'gnoland',
  ethereum = 'ethereum',
  base = 'base',
}

export enum BridgeType {
  union = 'union',
}

export const availableBridges: Record<BlockChainType, BridgeType[]> = {
  [BlockChainType.gnoland]: [BridgeType.union],
  [BlockChainType.ethereum]: [BridgeType.union],
  [BlockChainType.base]: [BridgeType.union],
}

export function getDefaultBridge(
  _from: BlockChainType,
  _to: BlockChainType
): BridgeType {
  return BridgeType.union
}

export function isGnoChain(chain: BlockChainType): boolean {
  return chain === BlockChainType.gnoland
}

export function isEvmChain(chain: BlockChainType): boolean {
  return chain === BlockChainType.ethereum || chain === BlockChainType.base
}

// Bech32 prefix for Gno.land addresses (`g1...`). RPC + chainId live in
// `src/consts/gnoNetworks.ts` and are resolved from the wallet at runtime.
export const GNOLAND_BECH32_PREFIX = 'g'

export const EVM_CHAIN_IDS: Record<string, number> = {
  [BlockChainType.ethereum]: 1,
  [BlockChainType.base]: 8453,
}

// Sepolia testnet chain id. Used by the gno-direct UNESCROW path because the
// wrapped ugnot ERC20 only lives on Sepolia.
export const SEPOLIA_EVM_CHAIN_ID = 11155111
