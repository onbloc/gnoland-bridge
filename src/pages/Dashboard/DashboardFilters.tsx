import { ReactElement } from 'react'

import type { TokenFilter, RouteFilter, TimeRange } from 'hooks/useDashboard'

const selectStyle: React.CSSProperties = {
  height: 32,
  padding: '0 var(--space-3)',
  border: '1px solid var(--border-1)',
  background: 'var(--bg-base)',
  borderRadius: 'var(--r-1)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-100)',
  color: 'var(--text-primary)',
  outline: 0,
  cursor: 'pointer',
}

const DashboardFilters = ({
  tokenFilter,
  routeFilter,
  timeRange,
  onTokenChange,
  onRouteChange,
  onTimeRangeChange,
}: {
  tokenFilter: TokenFilter
  routeFilter: RouteFilter
  timeRange: TimeRange
  onTokenChange: (v: TokenFilter) => void
  onRouteChange: (v: RouteFilter) => void
  onTimeRangeChange: (v: TimeRange) => void
}): ReactElement => (
  <div className="hstack" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
    <select
      value={tokenFilter}
      style={selectStyle}
      onChange={(e): void => onTokenChange(e.target.value as TokenFilter)}
    >
      <option value="all">All tokens</option>
      <option value="ATONE">ATONE</option>
      <option value="PHOTON">PHOTON</option>
    </select>

    <select
      value={routeFilter}
      style={selectStyle}
      onChange={(e): void => onRouteChange(e.target.value as RouteFilter)}
    >
      <option value="all">All routes</option>
      <option value="atomone-ethereum">AtomOne ↔ Ethereum</option>
      <option value="atomone-base">AtomOne ↔ Base</option>
    </select>

    <select
      value={timeRange}
      style={selectStyle}
      onChange={(e): void =>
        onTimeRangeChange(Number(e.target.value) as TimeRange)
      }
    >
      <option value={7}>7 days</option>
      <option value={30}>30 days</option>
      <option value={90}>90 days</option>
    </select>
  </div>
)

export default DashboardFilters
