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

// Mirrors fetchPacketHashFromTx (gno ABCI lookup) for the EVM side. The
// client-side estimate computed in eth-gno-zkgm.ts can drift from the packet
// hash the ZKGM contract actually commits on-chain, so once the relayer has
// indexed the submission tx we prefer its packet_hash over our own guess.
// Used by PacketTracker to re-resolve a stuck/mismatched estimate mid-poll.
export const fetchPacketHashByTxHash = async (
  address: string,
  txHash: string,
  retries = 6,
  delayMs = 800
): Promise<string | null> => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const { data } = await fetchWalletTransfers(address, { limit: 5 })
      const match = data.find((transfer) => transfer.tx_out === txHash)
      if (match) return match.packet_hash
    } catch (err) {
      console.warn('[relayer-api] wallet transfer lookup attempt failed', err)
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return null
}

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

export const getRelayerTokenSymbol = (token: string): string => {
  const normalized = token.toLowerCase()
  if (normalized === 'ugnot') return 'GNOT'
  // Wrapped ugnot on the EVM side - shown as plain GNOT since it's the same
  // underlying asset from the user's perspective.
  if (normalized.startsWith('0x')) return 'GNOT'
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
