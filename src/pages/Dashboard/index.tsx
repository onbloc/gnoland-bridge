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
    filteredTransfers,
    transfersLoading,
    transfersError,
    summaryLoading,
    summaryError,
    chartData,
    chartLoading,
    chartError,
    chartWindowSize,
    totalTransfers,
    successRate,
    processingCount,
    failedCount,
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
          onTokenChange={setTokenFilter}
          onRouteChange={handleRouteChange}
        />
      </div>

      {(transfersError || summaryError || chartError) && (
        <div
          className="alert alert--error"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <div>
            {transfersError?.message ??
              summaryError?.message ??
              chartError?.message ??
              'Failed to load data'}
          </div>
        </div>
      )}

      <div className="grid-stats">
        <StatsCard
          label="Total transfers"
          value={totalTransfers}
          subtitle="All indexed transfers"
          loading={summaryLoading}
        />
        <StatsCard
          label="Success rate"
          value={successRate != null ? `${successRate}%` : null}
          subtitle={`Loaded ${transfersCount} transfers`}
          loading={transfersLoading}
          brand
        />
        <StatsCard
          label="Processing"
          value={processingCount}
          subtitle="Loaded page"
          loading={transfersLoading}
        />
        <StatsCard
          label="Failed"
          value={failedCount}
          subtitle="Loaded page"
          loading={transfersLoading}
        />
      </div>

      <div style={{ height: 'var(--space-8)' }} />
      <TransferChart
        data={chartData}
        loading={chartLoading}
        windowSize={chartWindowSize}
      />

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
