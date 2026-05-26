import { Ucs05 } from '@unionlabs/sdk'
import { UniversalChainId } from '@unionlabs/sdk/schema/chain'
import { ChannelId } from '@unionlabs/sdk/schema/channel'

// Feature flag: enable Gno -> Union ZKGM direct (single-hop) flow.
// Default off until gno-ibc deployment is live.
export const GNO_DIRECT_ZKGM_ENABLED =
  import.meta.env.VITE_GNO_DIRECT_ZKGM === 'true'

// Canonical import alias is `gnoswap` (gnomod.toml in gno-ibc declares the
// module name as `gnoswap/...` even though the on-disk path is `core/...`).
// PR #24 happy-path scripts use these exact strings.
export const GNO_ZKGM_REALM_PATH = 'gno.land/r/gnoswap/ibc/v1/apps/zkgm'
export const GNO_ZKGM_TYPES_PATH = 'gno.land/p/gnoswap/ibc/zkgm'
export const GNO_CORE_PATH = 'gno.land/r/core/ibc/v1/core'
export const GNO_U256_PATH = 'gno.land/p/gnoswap/uint256'

// Instruction header (matches `p/core/ibc/zkgm/constants.gno`).
export const INSTR_VERSION_0 = 0
export const INSTR_VERSION_2 = 2
export const OP_CALL = 1
export const OP_TOKEN_ORDER = 3

// TokenOrderV2 Kind values. Mirrors the SDK's `kindToConst` mapping
// (`initialize -> 0`, `escrow -> 1`, `unescrow -> 2`, `solve -> 3`).
export const TOKEN_ORDER_KIND_INITIALIZE = 0 as const
export const TOKEN_ORDER_KIND_ESCROW = 1 as const
export const TOKEN_ORDER_KIND_UNESCROW = 2 as const
export const TOKEN_ORDER_KIND_SOLVE = 3 as const

// Default ugnot wrapped-token init params. Used to prefill the Token Init form
// so the operator can fire an INITIALIZE packet with one click. Mirrors the
// `ZkgmERC20.initialize(address authority, address minter, string name,
// string symbol, uint8 decimals)` signature on the EVM side.
export const GNO_INIT_TOKEN_NAME = 'gno.land'
export const GNO_INIT_TOKEN_SYMBOL = 'ugnot'
export const GNO_INIT_TOKEN_DECIMALS = 6
export const GNO_INIT_DEFAULT_BASE_AMOUNT = '1000000'
export const GNO_INIT_DEFAULT_QUOTE_TOKEN =
  '0x81E1e47D77c0596F01d6941d9FccD9e5cFBfE9da'
export const GNO_INIT_RAW_OPERAND_HEX = ''

const GNO_INIT_IMPLEMENTATION_ADDRESS_DEFAULT =
  '0xAf739F34ddF951cBC24fdbBa4f76213688E13627'
const GNO_INIT_AUTHORITY_ADDRESS_DEFAULT =
  '0x40cDFf51aE7487e0b4A4D6e5f86eB15Fb7c1d9f4'
const GNO_INIT_MINTER_ADDRESS_DEFAULT =
  '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03'

// Optional env overrides for the EVM-side wrapped-token deploy. Empty string
// here means "use the form-provided value or zero-address fallback"; the
// encoder treats any falsy address as 0x000...000 so the page still renders.
export const GNO_INIT_IMPLEMENTATION_ADDRESS =
  (import.meta.env.VITE_GNO_INIT_IMPLEMENTATION_ADDRESS as
    | string
    | undefined) || GNO_INIT_IMPLEMENTATION_ADDRESS_DEFAULT
export const GNO_INIT_AUTHORITY_ADDRESS =
  (import.meta.env.VITE_GNO_INIT_AUTHORITY_ADDRESS as string | undefined) ||
  GNO_INIT_AUTHORITY_ADDRESS_DEFAULT
export const GNO_INIT_MINTER_ADDRESS =
  (import.meta.env.VITE_GNO_INIT_MINTER_ADDRESS as string | undefined) ||
  GNO_INIT_MINTER_ADDRESS_DEFAULT

// Hot-fix escape hatch: if a fully-formed metadata blob is supplied via env,
// the encoder returns it verbatim instead of building one from the fields.
export const GNO_INIT_METADATA_HEX_OVERRIDE =
  (import.meta.env.VITE_GNO_INIT_METADATA_HEX as string | undefined) || ''

const GNO_CHAIN_ID_FALLBACK = 'gnoland.PLACEHOLDER'

// Lazy evaluation: schema validation runs only when the ZKGM direct path
// executes, so a placeholder identifier doesn't blow up module load.
export const getGnoChainId = (): ReturnType<typeof UniversalChainId.make> =>
  UniversalChainId.make(
    import.meta.env.VITE_GNO_CHAIN_ID || GNO_CHAIN_ID_FALLBACK
  )

export const isPlaceholderChainId = (): boolean =>
  !import.meta.env.VITE_GNO_CHAIN_ID ||
  import.meta.env.VITE_GNO_CHAIN_ID === GNO_CHAIN_ID_FALLBACK

const parseChannelId = (raw: string | undefined): number => {
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 1 ? n : 0
}

// Reverse direction channel (Union/EVM -> Gno) for the EVM->Gno flow.
export const UNION_TO_GNO_CHANNEL_ID = ChannelId.make(
  parseChannelId(import.meta.env.VITE_UNION_TO_GNO_CHANNEL_ID)
)

// EVM-side ZKGM contract (Sepolia testnet) that terminates the gno<->EVM
// channel pair. Same address is reused as the counterparty port id on the
// gno-ibc side. Hardcoded because we only operate on Sepolia for now.
export const ETH_ZKGM_SEPOLIA_ADDRESS =
  '0x5fbe74a283f7954f10aa04c2edf55578811aeb03' as const

// Sepolia chain id (EIP-155). Used for MetaMask switch + viem chain selection.
export const SEPOLIA_CHAIN_ID = 11155111

export const GNO_NATIVE_DENOM = 'ugnot'

// Map of canonical bridge baseToken keys to the Gno-side denom paid into
// the `send` field. Populated as routes get wired.
export const GNO_BASE_TOKEN_MAP: Record<string, string> = {
  ugnot: GNO_NATIVE_DENOM,
}

// Realm-side primitive-args wrapper that the bridge calls via /vm.m_call.
// Sits on the ZKGM realm and bypasses the struct-only `Send(...)` signature,
// preserving `IsUserCall()=true` so OriginSend reflects the attached coins.
export const RAW_SEND_FUNC = 'SendRaw' as const

// Gno-side TokenOrder sends are expensive. gno-ibc observed ESCROW at about
// 42.6M gas and INITIALIZE at about 51.6M gas.
export const GNO_DIRECT_GAS_WANTED = 12_000_000
export const GNO_CALL_GAS_WANTED = 90_000_000
export const GNO_INIT_GAS_WANTED = 90_000_000
export const GNO_DIRECT_GAS_FEE = 1

export const gnoUcs = (sender: string): Ucs05.CosmosDisplay =>
  Ucs05.CosmosDisplay.make({ address: sender as `${string}1${string}` })

export const isPlaceholderChannel = (channelId: number): boolean =>
  channelId <= 0
