import { encodeAbiParameters } from 'viem'

// Gno ABI mirrors Solidity ABI (Union's ucs03-zkgm encodes via `sol!` blocks,
// gno-side `p/core/encoding/abi` re-implements the same wire format). So viem
// `encodeAbiParameters` produces bytes that match `z.EncodeCall(...)` on Gno.
//
// Schema reference: `gno.land/p/core/ibc/zkgm/abi.gno` -> CallSchema.

export type GnoCall = {
  sender: `0x${string}`
  eureka: boolean
  contractAddress: `0x${string}`
  contractCalldata: `0x${string}`
}

export const utf8ToHex = (s: string): `0x${string}` => {
  const bytes = new TextEncoder().encode(s)
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

export const encodeCall = (call: GnoCall): `0x${string}` =>
  encodeAbiParameters(
    [{ type: 'bytes' }, { type: 'bool' }, { type: 'bytes' }, { type: 'bytes' }],
    [call.sender, call.eureka, call.contractAddress, call.contractCalldata]
  )

export const bytesToHex = (bytes: Uint8Array): `0x${string}` =>
  `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`

export const stripHexPrefix = (hex: string): string =>
  hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex

// GRC20 base tokens are identified by their realm package path (e.g.
// 'gno.land/r/demo/defi/grc20factory'), which always contains a '/'. Native
// coin denoms (ugnot, wugnot) never do. The zkgm realm takes custody of
// GRC20 tokens via TransferFrom (requires a prior Approve to the realm
// address) instead of the /vm.m_call `send` field used for native coins.
export const isGrc20BaseToken = (baseToken: string): boolean =>
  baseToken.includes('/')
