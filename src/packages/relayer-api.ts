import { makeGnoscanTransactionUrl } from 'config/network'
import routes from 'consts/routes'
import { SUPPORTED_ASSETS } from 'types/asset'
import { BlockChainType } from 'types/network'

export const RELAYER_API_BASE_URL = (
  (import.meta.env.VITE_RELAYER_API_URL as string | undefined) || '/relayer-api'
).replace(/\/$/, '')

export const RELAYER_CHAIN_IDS = {
  gnoland: 'topaz-1',
  ethereum: '11155111',
} as const

export const RELAYER_CHAIN_DISPLAY: Record<
  string,
  { name: string; color: string }
> = {
  [RELAYER_CHAIN_IDS.gnoland]: { name: 'GNO.LAND', color: '#175D38' },
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

// 0x-prefixed hashes are EVM txs -> Etherscan; everything else is a Gno tx
// hash -> gnoscan.
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
    // Relayer matches EVM addresses as exact lowercase strings, but
    // wagmi/viem return checksummed (mixed-case) addresses - lowercase here
    // to avoid silent 404s/empties. No-op for Gno bech32 addresses.
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

// Resolves a relayer-reported token (gno denom/pkgpath, or 0x EVM address)
// to its AssetDenomEnum value via routes.ts's baseToken/quoteToken pairing.
const resolveTokenDenom = (token: string): string | undefined => {
  if (DENOM_TO_SYMBOL.has(token)) return token

  const normalized = token.toLowerCase()
  const route = routes.find(
    (r) =>
      r.baseToken.toLowerCase() === normalized ||
      r.quoteToken.toLowerCase() === normalized
  )
  return route?.denom
}

// Multi-symbol GRC20 factory tokens report as a grc20reg '<pkgPath>.<symbol>'
// key (same convention as parseGrc20Token in useGnoBalance.ts) - the symbol
// is the segment after the last '/'s dot.
const symbolFromGrc20Key = (token: string): string | undefined => {
  const lastSlash = token.lastIndexOf('/')
  if (lastSlash === -1) return undefined
  const dotIndex = token.indexOf('.', lastSlash + 1)
  return dotIndex === -1 ? undefined : token.slice(dotIndex + 1).toUpperCase()
}

export const getRelayerTokenSymbol = (token: string): string => {
  const denom = resolveTokenDenom(token)
  const symbol = denom !== undefined ? DENOM_TO_SYMBOL.get(denom) : undefined
  return symbol ?? symbolFromGrc20Key(token) ?? token.toUpperCase()
}

export const getRelayerTransferTokenSymbol = (
  transfer: RelayerTransfer
): string => getRelayerTokenSymbol(transfer.base_token)

// base_amount is always wire-scaled to the higher of the two sides'
// decimals (the origin's true precision), regardless of transfer direction -
// confirmed against gno-ibc's token_send_voucher_with_decimal_trim_filetest.gno.
// baseDecimals alone would be wrong for legs like ERCT gno->eth
// (baseDecimals=6, quoteDecimals=18, wire amount is 18-scaled).
export const getRelayerTransferBaseDecimals = (
  transfer: RelayerTransfer
): number => {
  const normalized = transfer.base_token.toLowerCase()
  const route = routes.find((r) => r.baseToken.toLowerCase() === normalized)
  if (!route) return 6
  return Math.max(route.baseDecimals, route.quoteDecimals)
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

// Matches a wallet-transfers entry against the transfer being tracked
// client-side. Falls back from packetHash/tx_out (which can drift from
// what's actually indexed) to sender/receiver/amount/chain, but only
// against non-terminal transfers - otherwise a finished past transfer with
// the same sender/receiver/amount would match instead of the real,
// not-yet-indexed one, showing the new send as falsely "done" with the old
// transfer's tx links.
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
  if (isRelayerTransferTerminal(transfer)) return false
  return (
    isSameAddress(transfer.from_address, senderAddress) &&
    isSameAddress(transfer.to_address, receiverAddress) &&
    transfer.base_amount === amount &&
    (!sourceChainId || transfer.src_chain_id === sourceChainId) &&
    (!destinationChainId || transfer.dst_chain_id === destinationChainId)
  )
}

// Finds the tracked transfer via transferMatchesCurrent's progressive
// matching, so polling survives a drifted packetHash estimate instead of
// relying on a single /status/{packetHash} lookup.
export const findMatchingWalletTransfer = async (
  args: Omit<Parameters<typeof transferMatchesCurrent>[0], 'transfer'> & {
    address: string
  },
  params: RelayerListParams = { limit: 10 }
): Promise<RelayerTransfer | null> => {
  const { data } = await fetchWalletTransfers(args.address, params)
  return (
    (data ?? []).find((transfer) =>
      transferMatchesCurrent({ ...args, transfer })
    ) ?? null
  )
}
