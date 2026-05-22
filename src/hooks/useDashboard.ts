import { useMemo, useState, useCallback } from 'react'
import { useQuery } from 'react-query'

import {
  CHAIN_IDS,
  CHAIN_DISPLAY,
  fetchAtomOneTransfers,
  fetchAtomOneTransferStats,
  fetchLatencyStats,
  type Transfer,
  type TransferStats,
} from 'packages/union/dashboard-graphql'

export type TokenFilter = 'all' | 'ATONE' | 'PHOTON'
export type RouteFilter = 'all' | 'atomone-ethereum' | 'atomone-base'
export type TimeRange = 7 | 30 | 90

export interface ChartPoint {
  date: string
  total: number
  atomoneToEth: number
  ethToAtomone: number
  atomoneToBase: number
  baseToAtomone: number
}

function aggregateChartData(stats: TransferStats[]): ChartPoint[] {
  const byDate = new Map<string, ChartPoint>()

  for (const s of stats) {
    const date = s.day_date
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        total: 0,
        atomoneToEth: 0,
        ethToAtomone: 0,
        atomoneToBase: 0,
        baseToAtomone: 0,
      })
    }
    const point = byDate.get(date)!
    const count = Number(s.total_transfers)
    point.total += count

    const src = s.source_universal_chain_id
    const dest = s.destination_universal_chain_id
    if (src === CHAIN_IDS.osmosis && dest === CHAIN_IDS.ethereum)
      point.atomoneToEth += count
    else if (src === CHAIN_IDS.ethereum && dest === CHAIN_IDS.osmosis)
      point.ethToAtomone += count
    else if (src === CHAIN_IDS.osmosis && dest === CHAIN_IDS.base)
      point.atomoneToBase += count
    else if (src === CHAIN_IDS.base && dest === CHAIN_IDS.osmosis)
      point.baseToAtomone += count
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
}

export function useDashboard() {
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>(30)
  const [currentPage, setCurrentPage] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  const resetPagination = useCallback(() => {
    setCurrentPage(0)
    setCursors([undefined])
  }, [])

  const transfersQuery = useQuery(
    ['dashboard-transfers', routeFilter, currentPage, cursors[currentPage]],
    () =>
      fetchAtomOneTransfers({
        route: routeFilter === 'all' ? undefined : routeFilter,
        limit: 20,
        sortOrder: cursors[currentPage],
        comparison: 'lt',
      }),
    { staleTime: 30_000, refetchInterval: 60_000 }
  )

  const statsQuery = useQuery(
    ['dashboard-stats', timeRange],
    () => fetchAtomOneTransferStats(timeRange),
    { staleTime: 300_000, refetchInterval: 300_000 }
  )

  const latencyEthQuery = useQuery(
    ['dashboard-latency-eth'],
    () => fetchLatencyStats(CHAIN_IDS.osmosis, CHAIN_IDS.ethereum),
    { staleTime: 300_000 }
  )

  const latencyBaseQuery = useQuery(
    ['dashboard-latency-base'],
    () => fetchLatencyStats(CHAIN_IDS.osmosis, CHAIN_IDS.base),
    { staleTime: 300_000 }
  )

  const filteredTransfers = useMemo<Transfer[]>(() => {
    if (!transfersQuery.data) return []
    if (tokenFilter === 'all') return transfersQuery.data
    return transfersQuery.data.filter((t) => t.token_symbol === tokenFilter)
  }, [transfersQuery.data, tokenFilter])

  const totalTransfers = useMemo(() => {
    if (!statsQuery.data) return 0
    return statsQuery.data.reduce(
      (sum, s) => sum + Number(s.total_transfers),
      0
    )
  }, [statsQuery.data])

  const successRate = useMemo(() => {
    const transfers = transfersQuery.data
    if (!transfers || transfers.length === 0) return null
    const succeeded = transfers.filter((t) => t.success === true).length
    const total = transfers.filter((t) => t.success !== null).length
    return total > 0 ? Math.round((succeeded / total) * 100) : null
  }, [transfersQuery.data])

  const medianLatency = useMemo(() => {
    const eth = latencyEthQuery.data?.[0]?.secs_until_packet_ack?.median
    const base = latencyBaseQuery.data?.[0]?.secs_until_packet_ack?.median
    const vals = [eth, base].filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }, [latencyEthQuery.data, latencyBaseQuery.data])

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!statsQuery.data) return []
    return aggregateChartData(statsQuery.data)
  }, [statsQuery.data])

  // Derive active routes from actual traffic data (fixes Vue hardcoded "4")
  const activeRoutes = useMemo(() => {
    if (!statsQuery.data) return { count: 0, chains: '' }
    const activePairs = new Set(
      statsQuery.data
        .filter((s) => Number(s.total_transfers) > 0)
        .map(
          (s) =>
            `${s.source_universal_chain_id}:${s.destination_universal_chain_id}`
        )
    )
    const chainIds = new Set<string>()
    statsQuery.data.forEach((s) => {
      if (Number(s.total_transfers) > 0) {
        chainIds.add(s.source_universal_chain_id)
        chainIds.add(s.destination_universal_chain_id)
      }
    })
    const chains = Array.from(chainIds)
      .map((id) => CHAIN_DISPLAY[id]?.name ?? id)
      .join(', ')
    return { count: activePairs.size, chains }
  }, [statsQuery.data])

  const nextPage = useCallback(() => {
    const transfers = transfersQuery.data
    if (transfers && transfers.length > 0) {
      const lastSortOrder = transfers[transfers.length - 1].sort_order
      setCursors((prev) => {
        const next = [...prev]
        next[currentPage + 1] = lastSortOrder
        return next
      })
      setCurrentPage(currentPage + 1)
    }
  }, [transfersQuery.data, currentPage])

  const prevPage = useCallback(() => {
    if (currentPage > 0) setCurrentPage(currentPage - 1)
  }, [currentPage])

  return {
    tokenFilter,
    setTokenFilter,
    routeFilter,
    setRouteFilter,
    timeRange,
    setTimeRange,
    filteredTransfers,
    transfersLoading: transfersQuery.isLoading,
    transfersError: transfersQuery.error as Error | null,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error as Error | null,
    chartData,
    totalTransfers,
    successRate,
    medianLatency,
    activeRoutes,
    currentPage,
    nextPage,
    prevPage,
    resetPagination,
    hasNextPage: (transfersQuery.data?.length ?? 0) >= 20,
    hasPrevPage: currentPage > 0,
    transfersCount: transfersQuery.data?.length ?? 0,
  }
}
