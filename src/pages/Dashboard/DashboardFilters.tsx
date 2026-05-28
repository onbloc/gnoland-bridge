import { ReactElement } from 'react'

import type { TokenFilter, RouteFilter } from 'hooks/useDashboard'

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
  onTokenChange,
  onRouteChange,
}: {
  tokenFilter: TokenFilter
  routeFilter: RouteFilter
  onTokenChange: (v: TokenFilter) => void
  onRouteChange: (v: RouteFilter) => void
}): ReactElement => (
  <div className="hstack" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
    <select
      value={tokenFilter}
      style={selectStyle}
      onChange={(e): void => onTokenChange(e.target.value as TokenFilter)}
    >
      <option value="all">All tokens</option>
      <option value="GNOT">GNOT</option>
      <option value="WGNOT">WGNOT</option>
    </select>

    <select
      value={routeFilter}
      style={selectStyle}
      onChange={(e): void => onRouteChange(e.target.value as RouteFilter)}
    >
      <option value="all">All routes</option>
      <option value="gno-ethereum">Gno.land to Ethereum</option>
      <option value="ethereum-gno">Ethereum to Gno.land</option>
    </select>
  </div>
)

export default DashboardFilters
