import { useCallback, useMemo, useState } from 'react'
import { useQuery } from 'react-query'

import {
  fetchRelayerHistory,
  fetchRelayerSummary,
  getRelayerRouteKey,
  getRelayerTransferTokenSymbol,
  type RelayerTransfer,
} from 'packages/relayer-api'

export type TokenFilter = 'all' | 'GNOT' | 'WGNOT'
export type RouteFilter = 'all' | 'gno-ethereum' | 'ethereum-gno'

export interface ChartPoint {
  date: string
  total: number
  gnoToEth: number
  ethToGno: number
}

const PAGE_SIZE = 20

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
    point.total += 1
    const route = getRelayerRouteKey(transfer)
    if (route === 'gno-ethereum') point.gnoToEth += 1
    if (route === 'ethereum-gno') point.ethToGno += 1
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
    { staleTime: 10_000, refetchInterval: 10_000 }
  )

  const summaryQuery = useQuery(
    ['dashboard-summary'],
    () => fetchRelayerSummary(),
    { staleTime: 30_000, refetchInterval: 30_000 }
  )

  const pageTransfers = transfersQuery.data?.data ?? []

  const filteredTransfers = useMemo<RelayerTransfer[]>(() => {
    return pageTransfers.filter((transfer) => {
      const tokenMatches =
        tokenFilter === 'all' ||
        getRelayerTransferTokenSymbol(transfer) === tokenFilter
      const routeMatches =
        routeFilter === 'all' || getRelayerRouteKey(transfer) === routeFilter
      return tokenMatches && routeMatches
    })
  }, [pageTransfers, routeFilter, tokenFilter])

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
    () => aggregateChartData(filteredTransfers),
    [filteredTransfers]
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
