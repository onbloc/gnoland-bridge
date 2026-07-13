import { makeGnoscanTransactionUrl } from 'config/network'
import routes from 'consts/routes'
import { SUPPORTED_ASSETS } from 'types/asset'
import { BlockChainType } from 'types/network'

export const RELAYER_API_BASE_URL = (
  (import.meta.env.VITE_RELAYER_API_URL as string | undefined) || '/relayer-api'
).replace(/\/$/, '')

export const RELAYER_CHAIN_IDS = {
  gnoland: 'dev.ibc',
  ethereum: '11155111',
} as const

export const RELAYER_CHAIN_DISPLAY: Record<
  string,
  { name: string; color: string }
> = {
  [RELAYER_CHAIN_IDS.gnoland]: { name: 'Gno.land', color: '#175D38' },
  [RELAYER_CHAIN_IDS.ethereum]: { name: 'Ethereum', color: '#627EEA' },
}

export type RelayerTransferStatus = 0 | 1 | 2 | 3

export interface RelayerTransfer {
  id: number
  packet_hash: string
  src_chain_id: string
  dst_chain_id: string
  src_channel_id: number
  dst_channel_id: number
  from_address: string
  to_address: string
  base_token: string
  base_amount: string
  quote_token: string
  quote_amount: string
  height: number
  tx_out: string
  tx_in: string
  timeout_timestamp: number
  status: RelayerTransferStatus
  created_at: string
  done_at?: string
  err_msg?: string
}

export interface RelayerListResponse {
  data: RelayerTransfer[]
  limit: number
  offset: number
}

export interface RelayerSummary {
  total: number
}

export interface RelayerListParams {
  orderby?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

const buildUrl = (
  path: string,
  params: Record<string, string | number | undefined> = {}
): string => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) query.set(key, String(value))
  })
  const qs = query.toString()
  return `${RELAYER_API_BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Relayer API request failed: ${response.status} ${response.statusText}`
    )
  }
  return response.json() as Promise<T>
}

export const getRelayerStatusUrl = (packetHash: string): string =>
  buildUrl(`/status/${encodeURIComponent(packetHash)}`)

// Outbound legs (EVM chains) use 0x-prefixed hashes -> Etherscan. Everything
// else is a Gno-side tx hash -> the gnoscan build pointed at the dev.ibc RPC.
const SEPOLIA_EXPLORER_TX_URL = 'https://sepolia.etherscan.io/tx/'

export const getTxExplorerUrl = (hash: string): string =>
  hash.startsWith('0x')
    ? `${SEPOLIA_EXPLORER_TX_URL}${encodeURIComponent(hash)}`
    : makeGnoscanTransactionUrl(hash)

export const fetchWalletTransfers = (
  address: string,
  params: RelayerListParams = {}
): Promise<RelayerListResponse> =>
  fetchJson<RelayerListResponse>(
    // The relayer backend matches EVM addresses as exact (case-sensitive)
    // strings, lowercase only. wagmi/viem always return EIP-55 checksummed
    // (mixed-case) addresses, so an unmodified lookup silently 404s/empties.
    // Gno bech32 addresses are already lowercase, so this is a no-op for them.
    buildUrl(`/wallet/${encodeURIComponent(address.toLowerCase())}`, {
      orderby: params.orderby ?? 'desc',
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    })
  )

export const fetchRelayerHistory = (
  params: RelayerListParams = {}
): Promise<RelayerListResponse> =>
  fetchJson<RelayerListResponse>(
    buildUrl('/history', {
      orderby: params.orderby ?? 'desc',
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    })
  )

export const fetchRelayerSummary = (): Promise<RelayerSummary> =>
  fetchJson<RelayerSummary>(buildUrl('/summary'))

export const fetchRelayerStatus = (
  packetHash: string
): Promise<RelayerTransfer> =>
  fetchJson<RelayerTransfer>(
    buildUrl(`/status/${encodeURIComponent(packetHash)}`)
  )

export const getRelayerChainId = (
  chain: BlockChainType
): string | undefined => {
  if (chain === BlockChainType.gnoland) return RELAYER_CHAIN_IDS.gnoland
  if (chain === BlockChainType.ethereum) return RELAYER_CHAIN_IDS.ethereum
  return undefined
}

export const getRelayerChainName = (chainId: string): string =>
  RELAYER_CHAIN_DISPLAY[chainId]?.name ?? chainId

const DENOM_TO_SYMBOL = new Map<string, string>(
  SUPPORTED_ASSETS.map((asset) => [asset.denom, asset.symbol])
)
const DENOM_TO_DECIMALS = new Map<string, number>(
  SUPPORTED_ASSETS.map((asset) => [asset.denom, asset.decimals])
)

// Resolves a relayer-reported token - a gno denom, or an 0x EVM address - to
// the AssetDenomEnum value it represents. EVM-side tokens appear as their
// ERC20 address instead of a denom, so they're resolved via routes.ts
// (baseToken/quoteToken) back to the gno denom they pair with.
const resolveTokenDenom = (token: string): string | undefined => {
  if (DENOM_TO_SYMBOL.has(token)) return token

  const normalized = token.toLowerCase()
  if (normalized.startsWith('0x')) {
    const route = routes.find(
      (r) =>
        r.baseToken.toLowerCase() === normalized ||
        r.quoteToken.toLowerCase() === normalized
    )
    if (route) return route.denom
  }

  return undefined
}

export const getRelayerTokenSymbol = (token: string): string => {
  const denom = resolveTokenDenom(token)
  const symbol = denom !== undefined ? DENOM_TO_SYMBOL.get(denom) : undefined
  return symbol ?? token.toUpperCase()
}

export const getRelayerTransferTokenSymbol = (
  transfer: RelayerTransfer
): string => getRelayerTokenSymbol(transfer.base_token)

// base_amount is a raw value denominated in transfer.base_token - the token
// that actually left its origin chain - so its decimals (not the
// destination side's) determine the correct human-readable scale. This
// matters once source and destination decimals differ, e.g. an 18-decimal
// EVM ERC20 (ERCT) wrapped as a 6-decimal gno denom.
export const getRelayerTransferBaseDecimals = (
  transfer: RelayerTransfer
): number => {
  const denom = resolveTokenDenom(transfer.base_token)
  const decimals =
    denom !== undefined ? DENOM_TO_DECIMALS.get(denom) : undefined
  return decimals ?? 6
}

export const getRelayerTransferAmountValue = (
  transfer: RelayerTransfer,
  decimals = getRelayerTransferBaseDecimals(transfer)
): number => Number(transfer.base_amount) / Math.pow(10, decimals)

export const getRelayerTransferAmount = (
  transfer: RelayerTransfer,
  decimals = getRelayerTransferBaseDecimals(transfer)
): string => {
  const amount = getRelayerTransferAmountValue(transfer, decimals)
  if (!Number.isFinite(amount)) return '-'
  if (amount === 0) return '0'
  if (amount < 0.001) return '< 0.001'
  return amount.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export const getRelayerRouteKey = (
  transfer: RelayerTransfer
): 'gno-ethereum' | 'ethereum-gno' | 'unknown' => {
  if (
    transfer.src_chain_id === RELAYER_CHAIN_IDS.gnoland &&
    transfer.dst_chain_id === RELAYER_CHAIN_IDS.ethereum
  ) {
    return 'gno-ethereum'
  }
  if (
    transfer.src_chain_id === RELAYER_CHAIN_IDS.ethereum &&
    transfer.dst_chain_id === RELAYER_CHAIN_IDS.gnoland
  ) {
    return 'ethereum-gno'
  }
  return 'unknown'
}

export const isRelayerTransferTerminal = (transfer: RelayerTransfer): boolean =>
  transfer.status === 2 || transfer.status === 3

const isSameAddress = (a?: string, b?: string): boolean =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase()

// Matches a wallet-transfers entry against the transfer currently being
// tracked client-side. Falls back progressively because the client's
// off-chain packetHash/txHash estimates can drift from what actually gets
// indexed (see fetchPacketHashByTxHash above) - sender/receiver/amount/chain
// still uniquely identifies the transfer even when both hash estimates miss.
export const transferMatchesCurrent = ({
  transfer,
  packetHash,
  txHash,
  senderAddress,
  receiverAddress,
  amount,
  sourceChainId,
  destinationChainId,
}: {
  transfer: RelayerTransfer
  packetHash?: string
  txHash?: string
  senderAddress?: string
  receiverAddress?: string
  amount?: string
  sourceChainId?: string
  destinationChainId?: string
}): boolean => {
  if (packetHash && transfer.packet_hash === packetHash) return true
  if (txHash && transfer.tx_out === txHash) return true
  if (!senderAddress || !receiverAddress || !amount) return false
  return (
    isSameAddress(transfer.from_address, senderAddress) &&
    isSameAddress(transfer.to_address, receiverAddress) &&
    transfer.base_amount === amount &&
    (!sourceChainId || transfer.src_chain_id === sourceChainId) &&
    (!destinationChainId || transfer.dst_chain_id === destinationChainId)
  )
}

// Finds the tracked transfer in a wallet's recent history using the same
// progressive matching as transferMatchesCurrent (packetHash -> tx_out ->
// sender/receiver/amount/chain). Used to keep polling resilient to a
// drifted/wrong packetHash estimate instead of relying on a single direct
// /status/{packetHash} lookup.
export const findMatchingWalletTransfer = async (
  args: Omit<Parameters<typeof transferMatchesCurrent>[0], 'transfer'> & {
    address: string
  },
  params: RelayerListParams = { limit: 10 }
): Promise<RelayerTransfer | null> => {
  const { data } = await fetchWalletTransfers(args.address, params)
  return data.find((transfer) => transferMatchesCurrent({ ...args, transfer })) ?? null
}
