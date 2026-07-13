import { useCallback, useMemo, useState } from 'react'
import { useQuery } from 'react-query'

import {
  fetchRelayerHistory,
  fetchRelayerSummary,
  getRelayerRouteKey,
  getRelayerTransferAmountValue,
  getRelayerTransferTokenSymbol,
  type RelayerTransfer,
} from 'packages/relayer-api'

export type TokenFilter = 'all' | 'GNOT' | 'GRCT' | 'ERCT'
export type RouteFilter = 'all' | 'gno-ethereum' | 'ethereum-gno'

export interface ChartPoint {
  date: string
  total: number
  gnoToEth: number
  ethToGno: number
}

const PAGE_SIZE = 20
const CHART_LIMIT = 100

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

  const successRate = useMemo(() => {
    if (pageTransfers.length === 0) return null
    const succeeded = pageTransfers.filter((t) => t.status === 2).length
    return Math.round((succeeded / pageTransfers.length) * 100)
  }, [pageTransfers])

  const processingCount = useMemo(
    () => pageTransfers.filter((t) => t.status === 0 || t.status === 1).length,
    [pageTransfers]
  )

  const failedCount = useMemo(
    () => pageTransfers.filter((t) => t.status === 3).length,
    [pageTransfers]
  )

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
    transfersCount: pageTransfers.length,
  }
}
