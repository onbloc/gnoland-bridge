import { ReactElement } from 'react'

const StatsCard = ({
  label,
  value,
  subtitle,
  loading = false,
  brand = false,
}: {
  label: string
  value: string | number | null
  subtitle?: string
  loading?: boolean
  brand?: boolean
}): ReactElement => (
  <div className="stat">
    <div className="stat__label">{label}</div>
    {loading ? (
      <div
        style={{
          height: 28,
          width: 80,
          background: 'var(--bg-surface-1)',
          borderRadius: 'var(--r-1)',
        }}
      />
    ) : (
      <div className={`stat__value${brand ? ' brand' : ''}`}>
        {value ?? '-'}
      </div>
    )}
    {subtitle && <div className="stat__sub">{subtitle}</div>}
  </div>
)

export default StatsCard
