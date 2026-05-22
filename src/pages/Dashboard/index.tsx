import { ReactElement } from 'react'

import { useDashboard } from 'hooks/useDashboard'
import DashboardFilters from './DashboardFilters'
import StatsCard from './StatsCard'
import TransferChart from './TransferChart'
import TransferTable from './TransferTable'

const Dashboard = (): ReactElement => {
  const {
    tokenFilter,
    setTokenFilter,
    routeFilter,
    setRouteFilter,
    timeRange,
    setTimeRange,
    filteredTransfers,
    transfersLoading,
    transfersError,
    statsLoading,
    statsError,
    chartData,
    totalTransfers,
    successRate,
    medianLatency,
    activeRoutes,
    currentPage,
    nextPage,
    prevPage,
    resetPagination,
    hasNextPage,
    hasPrevPage,
    transfersCount,
  } = useDashboard()

  const handleRouteChange = (v: typeof routeFilter): void => {
    setRouteFilter(v)
    resetPagination()
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Bridge activity</h1>
        <p className="page-sub">
          Live view of bridge volume, success rate, and recent transfers across
          all routes.
        </p>
      </div>

      <div
        className="between"
        style={{
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <span className="section-title">Filters</span>
        <DashboardFilters
          tokenFilter={tokenFilter}
          routeFilter={routeFilter}
          timeRange={timeRange}
          onTokenChange={setTokenFilter}
          onRouteChange={handleRouteChange}
          onTimeRangeChange={setTimeRange}
        />
      </div>

      {(transfersError || statsError) && (
        <div
          className="alert alert--error"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <div>
            {transfersError?.message ??
              statsError?.message ??
              'Failed to load data'}
          </div>
        </div>
      )}

      <div className="grid-stats">
        <StatsCard
          label="Total transfers"
          value={totalTransfers}
          subtitle={`Last ${timeRange} days`}
          loading={statsLoading}
        />
        <StatsCard
          label="Success rate"
          value={successRate != null ? `${successRate}%` : null}
          subtitle={`Last ${transfersCount} transfers`}
          loading={transfersLoading}
          brand
        />
        <StatsCard
          label="Median bridge time"
          value={medianLatency != null ? `${medianLatency}s` : null}
          subtitle="Median end-to-end"
        />
        <StatsCard
          label="Active routes"
          value={statsLoading ? null : activeRoutes.count || null}
          subtitle={activeRoutes.chains || undefined}
          loading={statsLoading}
        />
      </div>

      <div style={{ height: 'var(--space-8)' }} />
      <TransferChart data={chartData} loading={statsLoading} />

      <div style={{ height: 'var(--space-8)' }} />
      <TransferTable
        transfers={filteredTransfers}
        loading={transfersLoading}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        currentPage={currentPage}
        onNext={nextPage}
        onPrev={prevPage}
      />
    </div>
  )
}

export default Dashboard
