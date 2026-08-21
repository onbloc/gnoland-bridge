import { useCallback, useMemo, useState } from 'react'
import { useQuery } from 'react-query'

import {
  fetchRelayerHistory,
  fetchRelayerRecentSummary,
  fetchRelayerSummary,
  getRelayerRouteKey,
  getRelayerTransferAmountValue,
  getRelayerTransferTokenSymbol,
  type RelayerTransfer,
} from 'packages/relayer-api'

export type TokenFilter = 'all' | 'GNOT' | 'ETH' | 'USDT'
export type RouteFilter = 'all' | 'gno-ethereum' | 'ethereum-gno'

export interface ChartPoint {
  date: string
  total: number
  gnoToEth: number
  ethToGno: number
}

const PAGE_SIZE = 20
const CHART_LIMIT = 1000
// Success rate / processing / failed stats come from the aggregate
// /summary/recent endpoint so they reflect a much wider recent window than
// the transfer table's current page.
const RECENT_SUMMARY_LIMIT = 1000

const formatDateKey = (timestamp: string): string =>
  timestamp ? timestamp.slice(0, 10) : 'Unknown'

function aggregateChartData(transfers: RelayerTransfer[]): ChartPoint[] {
  const byDate = new Map<string, ChartPoint>()

  for (const transfer of transfers) {
    const date = formatDateKey(transfer.created_at)
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        total: 0,
        gnoToEth: 0,
        ethToGno: 0,
      })
    }

    const point = byDate.get(date)!
    const amount = getRelayerTransferAmountValue(transfer)
    if (!Number.isFinite(amount)) continue

    const route = getRelayerRouteKey(transfer)
    if (route === 'gno-ethereum') {
      point.gnoToEth += amount
      point.total += amount
    } else if (route === 'ethereum-gno') {
      point.ethToGno += amount
      point.total += amount
    } else {
      // Only gno-land<->ethereum is configured (RELAYER_CHAIN_IDS), so this
      // signals a chain-id config drift or bad backend data rather than a
      // real route — exclude it from the chart's scale instead of silently
      // inflating the axis with a value that's never drawn.
      console.warn(
        '[useDashboard] transfer with unrecognized chain route excluded from chart',
        transfer.packet_hash,
        transfer.src_chain_id,
        transfer.dst_chain_id
      )
    }
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
}

export function useDashboard() {
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all')
  const [routeFilter, setRouteFilter] = useState<RouteFilter>('all')
  const [currentPage, setCurrentPage] = useState(0)

  const resetPagination = useCallback(() => {
    setCurrentPage(0)
  }, [])

  const transfersQuery = useQuery(
    ['dashboard-history', currentPage],
    () =>
      fetchRelayerHistory({
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
        orderby: 'desc',
      }),
    { staleTime: 10_000, refetchInterval: 10_000, keepPreviousData: true }
  )

  // Independent of table pagination, so the chart always reflects a
  // consistent recent window instead of reshuffling to whichever page the
  // table happens to be on.
  const chartQuery = useQuery(
    ['dashboard-chart'],
    () => fetchRelayerHistory({ limit: CHART_LIMIT, offset: 0, orderby: 'desc' }),
    { staleTime: 10_000, refetchInterval: 10_000 }
  )

  const summaryQuery = useQuery(
    ['dashboard-summary'],
    () => fetchRelayerSummary(),
    { staleTime: 30_000, refetchInterval: 30_000 }
  )

  const recentSummaryQuery = useQuery(
    ['dashboard-recent-summary'],
    () => fetchRelayerRecentSummary(RECENT_SUMMARY_LIMIT),
    { staleTime: 10_000, refetchInterval: 10_000 }
  )

  const matchesFilters = useCallback(
    (transfer: RelayerTransfer): boolean => {
      const tokenMatches =
        tokenFilter === 'all' ||
        getRelayerTransferTokenSymbol(transfer) === tokenFilter
      const routeMatches =
        routeFilter === 'all' || getRelayerRouteKey(transfer) === routeFilter
      return tokenMatches && routeMatches
    },
    [routeFilter, tokenFilter]
  )

  const pageTransfers = transfersQuery.data?.data ?? []
  const chartTransfers = chartQuery.data?.data ?? []

  const filteredTransfers = useMemo<RelayerTransfer[]>(
    () => pageTransfers.filter(matchesFilters),
    [pageTransfers, matchesFilters]
  )

  const filteredChartTransfers = useMemo<RelayerTransfer[]>(
    () => chartTransfers.filter(matchesFilters),
    [chartTransfers, matchesFilters]
  )

  const recentSummary = recentSummaryQuery.data

  const successRate = useMemo(() => {
    if (!recentSummary || recentSummary.total === 0) return null
    return Math.round((recentSummary.succeeded / recentSummary.total) * 100)
  }, [recentSummary])

  // "Processing" covers both sub-states the API reports for an in-flight
  // transfer (detected on the source chain, then relaying/processing).
  const processingCount = recentSummary
    ? recentSummary.detected + recentSummary.processing
    : 0

  const failedCount = recentSummary?.failed ?? 0

  const chartData = useMemo<ChartPoint[]>(
    () => aggregateChartData(filteredChartTransfers),
    [filteredChartTransfers]
  )

  const totalTransfers = summaryQuery.data?.total ?? 0

  const nextPage = useCallback(() => {
    setCurrentPage((page) => page + 1)
  }, [])

  const prevPage = useCallback(() => {
    setCurrentPage((page) => Math.max(page - 1, 0))
  }, [])

  return {
    tokenFilter,
    setTokenFilter,
    routeFilter,
    setRouteFilter,
    filteredTransfers,
    transfersLoading: transfersQuery.isLoading,
    transfersError: transfersQuery.error as Error | null,
    summaryLoading: summaryQuery.isLoading,
    summaryError: summaryQuery.error as Error | null,
    chartData,
    chartLoading: chartQuery.isLoading,
    chartError: chartQuery.error as Error | null,
    chartWindowSize: CHART_LIMIT,
    totalTransfers,
    successRate,
    successRateSampleSize: recentSummary?.total ?? 0,
    recentSummaryLoading: recentSummaryQuery.isLoading,
    recentSummaryError: recentSummaryQuery.error as Error | null,
    processingCount,
    failedCount,
    currentPage,
    nextPage,
    prevPage,
    resetPagination,
    hasNextPage:
      pageTransfers.length >= PAGE_SIZE &&
      (currentPage + 1) * PAGE_SIZE < totalTransfers,
    hasPrevPage: currentPage > 0,
  }
}
