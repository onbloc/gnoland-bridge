import { BlockChainType } from 'types/network'
import { SUPPORTED_ASSETS } from 'types/asset'
import routes from 'consts/routes'

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
const GNOSCAN_TX_URL =
  'https://gnoscan-git-feature-gns-372-onbloc.vercel.app/transactions/details?type=custom&rpcUrl=http://23.20.153.250:26657/&indexerUrl=&txhash='

export const getTxExplorerUrl = (hash: string): string =>
  hash.startsWith('0x')
    ? `${SEPOLIA_EXPLORER_TX_URL}${encodeURIComponent(hash)}`
    : `${GNOSCAN_TX_URL}${encodeURIComponent(hash)}`

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

export const getRelayerTokenSymbol = (token: string): string => {
  // Native coins and GRC20 realm paths appear on the relayer as their gno
  // denom, matching an AssetDenomEnum value directly.
  const directSymbol = DENOM_TO_SYMBOL.get(token)
  if (directSymbol) return directSymbol

  // EVM-side wrapped tokens appear as their ERC20 address instead - resolve
  // via routes.ts (baseToken/quoteToken) back to the gno denom they pair
  // with, then to that denom's display symbol.
  const normalized = token.toLowerCase()
  if (normalized.startsWith('0x')) {
    const route = routes.find(
      (r) =>
        r.baseToken.toLowerCase() === normalized ||
        r.quoteToken.toLowerCase() === normalized
    )
    const symbol = route && DENOM_TO_SYMBOL.get(route.denom)
    if (symbol) return symbol
  }

  return token.toUpperCase()
}

export const getRelayerTransferTokenSymbol = (
  transfer: RelayerTransfer
): string => getRelayerTokenSymbol(transfer.base_token)

export const getRelayerTransferAmountValue = (
  transfer: RelayerTransfer,
  decimals = 6
): number => Number(transfer.base_amount) / Math.pow(10, decimals)

export const getRelayerTransferAmount = (
  transfer: RelayerTransfer,
  decimals = 6
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
