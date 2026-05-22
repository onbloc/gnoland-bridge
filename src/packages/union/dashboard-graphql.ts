const UNION_GRAPHQL_URL = 'https://graphql.union.build/v1/graphql'

// Union chain IDs: AtomOne bridges through Osmosis as the Union intermediary
export const CHAIN_IDS = {
  osmosis: 'osmosis.osmosis-1',
  ethereum: 'ethereum.1',
  base: 'base.8453',
} as const

export type ChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS]

export const CHAIN_DISPLAY: Record<string, { name: string; color: string }> = {
  [CHAIN_IDS.osmosis]: { name: 'AtomOne', color: '#6BEFFF' },
  [CHAIN_IDS.ethereum]: { name: 'Ethereum', color: '#627EEA' },
  [CHAIN_IDS.base]: { name: 'Base', color: '#0052FF' },
}

// Known ERC20 contract addresses (lowercased) for token identification.
// base_token_symbol is null in the API, so we identify tokens by their
// quote_token (ERC20 address) or base_token (hex-encoded IBC denom).
const ATONE_ERC20 = '0xa1a1d0b9182339e86e80db519218ea03ec09a1a1'
const PHOTON_ERC20 = '0x222c042e17d94f4c83720583c75a37242921ba1c'

// IBC denoms on Osmosis (hex-encoded as they appear in base_token)
const ATONE_IBC_HEX =
  '0x' +
  hexEncode(
    'ibc/BC26A7A805ECD6822719472BCB7842A48EF09DF206182F8F259B2593EB5D23FB'
  )
const PHOTON_IBC_HEX =
  '0x' +
  hexEncode(
    'ibc/D6E02C5AE8A37FC2E3AB1FC8AC168878ADB870549383DFFEA9FD020C234520A7'
  )

function hexEncode(str: string): string {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Resolve token symbol from a transfer's base_token / quote_token fields.
 * Union API returns null for base_token_symbol on these routes, so we match
 * against the known ERC20 addresses and IBC denom hex values.
 */
export function resolveTokenSymbol(transfer: RawTransfer): string {
  const base = (transfer.base_token ?? '').toLowerCase()
  const quote = (transfer.quote_token ?? '').toLowerCase()

  // Check ERC20 addresses (appear in either base_token or quote_token)
  if (base === ATONE_ERC20 || quote === ATONE_ERC20) return 'ATONE'
  if (base === PHOTON_ERC20 || quote === PHOTON_ERC20) return 'PHOTON'

  // Check IBC denom hex
  if (
    base === ATONE_IBC_HEX.toLowerCase() ||
    quote === ATONE_IBC_HEX.toLowerCase()
  )
    return 'ATONE'
  if (
    base === PHOTON_IBC_HEX.toLowerCase() ||
    quote === PHOTON_IBC_HEX.toLowerCase()
  )
    return 'PHOTON'

  return 'Unknown'
}

// --- Types ---

/** Raw shape from the GraphQL API */
interface RawTransfer {
  packet_hash: string
  success: boolean | null
  sender_display: string
  receiver_display: string
  source_universal_chain_id: string
  destination_universal_chain_id: string
  base_amount: string
  base_token: string | null
  base_token_symbol: string | null
  base_token_decimals: number | null
  quote_token: string | null
  quote_amount: string | null
  transfer_send_timestamp: string | null
  transfer_recv_timestamp: string | null
  sort_order: string
}

/** Enriched transfer with resolved token symbol */
export interface Transfer {
  packet_hash: string
  success: boolean | null
  sender_display: string
  receiver_display: string
  source_universal_chain_id: string
  destination_universal_chain_id: string
  base_amount: string
  token_symbol: string
  token_decimals: number
  transfer_send_timestamp: string | null
  transfer_recv_timestamp: string | null
  sort_order: string
}

export interface TransferStats {
  day_date: string
  source_universal_chain_id: string
  destination_universal_chain_id: string
  total_transfers: string | number // API returns string
}

export interface LatencyStats {
  secs_until_packet_recv: { p5: number; median: number; p95: number } | null
  secs_until_write_ack: { p5: number; median: number; p95: number } | null
  secs_until_packet_ack: { p5: number; median: number; p95: number } | null
}

export interface TransferFilters {
  sourceChainId?: string
  destinationChainId?: string
  limit?: number
  sortOrder?: string
  comparison?: 'lt' | 'gt'
}

// --- Queries ---

const TRANSFERS_QUERY = `
query Transfers(
  $p_source_universal_chain_id: String,
  $p_destination_universal_chain_id: String,
  $p_limit: Int,
  $p_sort_order: String,
  $p_comparison: ComparisonOp!
) @cached(ttl: 30) {
  v2_transfers(args: {
    p_source_universal_chain_id: $p_source_universal_chain_id,
    p_destination_universal_chain_id: $p_destination_universal_chain_id,
    p_limit: $p_limit,
    p_sort_order: $p_sort_order,
    p_comparison: $p_comparison
  }) {
    packet_hash
    success
    sender_display
    receiver_display
    source_universal_chain_id
    destination_universal_chain_id
    base_amount
    base_token
    base_token_symbol
    base_token_decimals
    quote_token
    quote_amount
    transfer_send_timestamp
    transfer_recv_timestamp
    sort_order
  }
}`

const TRANSFER_STATS_QUERY = `
query TransferStats(
  $p_days_back: Int,
  $p_source_universal_chain_id: String,
  $p_destination_universal_chain_id: String
) @cached(ttl: 300) {
  v2_stats_transfers_chain(args: {
    p_days_back: $p_days_back,
    p_source_universal_chain_id: $p_source_universal_chain_id,
    p_destination_universal_chain_id: $p_destination_universal_chain_id
  }) {
    day_date
    source_universal_chain_id
    destination_universal_chain_id
    total_transfers
  }
}`

const LATENCY_QUERY = `
query Latency(
  $p_source_universal_chain_id: String,
  $p_destination_universal_chain_id: String
) @cached(ttl: 60) {
  v2_stats_latency(args: {
    p_source_universal_chain_id: $p_source_universal_chain_id,
    p_destination_universal_chain_id: $p_destination_universal_chain_id
  }) {
    secs_until_packet_recv { p5 median p95 }
    secs_until_write_ack { p5 median p95 }
    secs_until_packet_ack { p5 median p95 }
  }
}`

// --- Fetchers ---

async function graphqlFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  dataKey: string
): Promise<T> {
  const response = await fetch(UNION_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(
      `Union GraphQL request failed: ${response.status} ${response.statusText}`
    )
  }

  const result = await response.json()
  if (result.errors) {
    throw new Error(`Union GraphQL errors: ${JSON.stringify(result.errors)}`)
  }

  return result.data[dataKey] as T
}

/** Enrich raw API transfers with resolved token symbol and decimals */
function enrichTransfers(raw: RawTransfer[]): Transfer[] {
  return raw.map((t) => {
    const symbol = resolveTokenSymbol(t)
    return {
      packet_hash: t.packet_hash,
      success: t.success,
      sender_display: t.sender_display,
      receiver_display: t.receiver_display,
      source_universal_chain_id: t.source_universal_chain_id,
      destination_universal_chain_id: t.destination_universal_chain_id,
      base_amount: t.base_amount,
      token_symbol: symbol,
      token_decimals: 6, // Both ATONE and PHOTON use 6 decimals
      transfer_send_timestamp: t.transfer_send_timestamp,
      transfer_recv_timestamp: t.transfer_recv_timestamp,
      sort_order: t.sort_order,
    }
  })
}

export async function fetchTransferHistory(
  filters: TransferFilters = {}
): Promise<Transfer[]> {
  const variables: Record<string, unknown> = {
    p_limit: filters.limit ?? 20,
    p_comparison: filters.comparison ?? 'lt',
  }
  if (filters.sourceChainId)
    variables.p_source_universal_chain_id = filters.sourceChainId
  if (filters.destinationChainId)
    variables.p_destination_universal_chain_id = filters.destinationChainId
  if (filters.sortOrder) variables.p_sort_order = filters.sortOrder

  const raw = await graphqlFetch<RawTransfer[]>(
    TRANSFERS_QUERY,
    variables,
    'v2_transfers'
  )
  return enrichTransfers(raw)
}

export async function fetchTransferStats(
  daysBack = 30,
  sourceChainId?: string,
  destinationChainId?: string
): Promise<TransferStats[]> {
  const variables: Record<string, unknown> = { p_days_back: daysBack }
  if (sourceChainId) variables.p_source_universal_chain_id = sourceChainId
  if (destinationChainId)
    variables.p_destination_universal_chain_id = destinationChainId

  return graphqlFetch<TransferStats[]>(
    TRANSFER_STATS_QUERY,
    variables,
    'v2_stats_transfers_chain'
  )
}

export async function fetchLatencyStats(
  sourceChainId: string,
  destinationChainId: string
): Promise<LatencyStats[]> {
  return graphqlFetch<LatencyStats[]>(
    LATENCY_QUERY,
    {
      p_source_universal_chain_id: sourceChainId,
      p_destination_universal_chain_id: destinationChainId,
    },
    'v2_stats_latency'
  )
}

/**
 * All route pairs for AtomOne bridging.
 * AtomOne uses Osmosis as the Union intermediary, so all Union packets
 * are between osmosis.osmosis-1 and the EVM chains.
 */
function getRouteFilters(
  route?: string
): Array<{ source: string; dest: string }> {
  if (route === 'atomone-ethereum') {
    return [
      { source: CHAIN_IDS.osmosis, dest: CHAIN_IDS.ethereum },
      { source: CHAIN_IDS.ethereum, dest: CHAIN_IDS.osmosis },
    ]
  }
  if (route === 'atomone-base') {
    return [
      { source: CHAIN_IDS.osmosis, dest: CHAIN_IDS.base },
      { source: CHAIN_IDS.base, dest: CHAIN_IDS.osmosis },
    ]
  }
  // All routes
  return [
    { source: CHAIN_IDS.osmosis, dest: CHAIN_IDS.ethereum },
    { source: CHAIN_IDS.ethereum, dest: CHAIN_IDS.osmosis },
    { source: CHAIN_IDS.osmosis, dest: CHAIN_IDS.base },
    { source: CHAIN_IDS.base, dest: CHAIN_IDS.osmosis },
  ]
}

/**
 * Fetch transfers for all AtomOne-related routes (both directions).
 * Merges results from multiple route queries and sorts by timestamp.
 */
export async function fetchAtomOneTransfers(
  filters: Omit<TransferFilters, 'sourceChainId' | 'destinationChainId'> & {
    route?: string
  } = {}
): Promise<Transfer[]> {
  const routes = getRouteFilters(filters.route)

  const results = await Promise.all(
    routes.map((r) =>
      fetchTransferHistory({
        ...filters,
        sourceChainId: r.source,
        destinationChainId: r.dest,
      })
    )
  )

  // Merge, deduplicate by packet_hash, and sort by timestamp desc
  const seen = new Set<string>()
  const merged: Transfer[] = []
  for (const batch of results) {
    for (const t of batch) {
      if (!seen.has(t.packet_hash)) {
        seen.add(t.packet_hash)
        merged.push(t)
      }
    }
  }

  merged.sort((a, b) => {
    const ta = a.transfer_send_timestamp ?? ''
    const tb = b.transfer_send_timestamp ?? ''
    return tb.localeCompare(ta)
  })

  return merged.slice(0, filters.limit ?? 20)
}

/**
 * Fetch daily transfer stats for all AtomOne routes.
 */
export async function fetchAtomOneTransferStats(
  daysBack = 30
): Promise<TransferStats[]> {
  const routes = getRouteFilters()
  const results = await Promise.all(
    routes.map((r) => fetchTransferStats(daysBack, r.source, r.dest))
  )
  return results.flat()
}
