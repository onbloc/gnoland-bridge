import {
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  parseAbiParameters,
} from 'viem'

import { GNO_INIT_METADATA_HEX_OVERRIDE } from './gno-zkgm-constants'

// Union ZKGM v2 TokenMetadata layout (from @unionlabs/sdk Ucs03 ABI):
//   struct TokenMetadata { bytes implementation; bytes initializer; }
// `initializer` is the calldata that ZKGM passes to the freshly deployed
// wrapped ERC20. The deployed contract on Sepolia exposes
//   initialize(address authority, address minter, string name,
//              string symbol, uint8 decimals)
// so the initializer must encode that exact selector + args.

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

const ZKGM_ERC20_INITIALIZE_ABI = [
  {
    type: 'function',
    name: 'initialize',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'authority', type: 'address' },
      { name: 'minter', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'decimals', type: 'uint8' },
    ],
    outputs: [],
  },
] as const

const TOKEN_METADATA_ABI = parseAbiParameters(
  'bytes implementation, bytes initializer'
)

const sanitizeAddress = (raw: string): `0x${string}` => {
  const trimmed = raw.trim()
  if (!trimmed) return ZERO_ADDRESS
  if (!isAddress(trimmed)) {
    throw new Error(`Invalid EVM address for INITIALIZE metadata: ${raw}`)
  }
  return trimmed as `0x${string}`
}

const normalizeHexOverride = (raw: string): `0x${string}` | '' => {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const withPrefix = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
  if (!/^0x[0-9a-fA-F]*$/.test(withPrefix)) {
    throw new Error(`INITIALIZE metadata override must be hex: ${raw}`)
  }
  return withPrefix as `0x${string}`
}

export type InitMetadataInput = {
  // ZkgmERC20 implementation address that ZKGM clones via CREATE2. Falls back
  // to 0x0 when omitted, which is only valid against an EVM ZKGM build that
  // resolves the implementation internally.
  implementation?: string
  // Access-control authority + minter wired into the freshly initialized
  // ERC20. Both fall back to 0x0 when omitted.
  authority?: string
  minter?: string
  name: string
  symbol: string
  decimals: number
  // Optional raw bytes that bypass the encoder. When provided (or when the
  // VITE_GNO_INIT_METADATA_HEX env var is set), the function returns the hex
  // verbatim. Used as an emergency override when the on-chain layout drifts.
  overrideHex?: string
}

export const encodeInitMetadataHex = (
  input: InitMetadataInput
): `0x${string}` => {
  const override = normalizeHexOverride(
    input.overrideHex || GNO_INIT_METADATA_HEX_OVERRIDE
  )
  if (override) return override

  if (!Number.isInteger(input.decimals) || input.decimals < 0) {
    throw new Error(`Invalid decimals for INITIALIZE: ${input.decimals}`)
  }

  const authority = sanitizeAddress(input.authority || '')
  const minter = sanitizeAddress(input.minter || '')
  const implementation = sanitizeAddress(input.implementation || '')

  const initializer = encodeFunctionData({
    abi: ZKGM_ERC20_INITIALIZE_ABI,
    functionName: 'initialize',
    args: [authority, minter, input.name, input.symbol, input.decimals],
  })

  return encodeAbiParameters(TOKEN_METADATA_ABI, [
    implementation,
    initializer,
  ]) as `0x${string}`
}
