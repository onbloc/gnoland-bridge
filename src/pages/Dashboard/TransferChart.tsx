import { ReactElement, useMemo, useState } from 'react'

import type { ChartPoint, TokenFilter } from 'hooks/useDashboard'

const SERIES = [
  {
    key: 'gnoToEth',
    color: 'oklch(0.72 0.13 158)',
    label: 'Gno.land to Ethereum',
  },
  {
    key: 'ethToGno',
    color: 'oklch(0.58 0.14 158)',
    label: 'Ethereum to Gno.land',
  },
] as const

const formatDate = (dateStr: string): string => {
  if (dateStr === 'Unknown') return dateStr
  // dateStr is a "YYYY-MM-DD" UTC calendar-day key (see formatDateKey in
  // useDashboard.ts). Parse the parts directly instead of going through
  // `new Date(dateStr)` — that parses as UTC midnight but `.getMonth()` /
  // `.getDate()` read local time, shifting the label a day back in any
  // timezone behind UTC.
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

const TransferChart = ({
  data,
  loading = false,
  windowSize,
  tokenFilter,
}: {
  data: ChartPoint[]
  loading?: boolean
  windowSize?: number
  tokenFilter: TokenFilter
}): ReactElement => {
  // 'all' mixes tokens with different units into one sum, so there's no
  // single unit to label it with - only show a unit once a specific token
  // is selected.
  const unitLabel = tokenFilter === 'all' ? '' : ` ${tokenFilter}`
  const maxValue = useMemo(
    () => (data.length ? Math.max(...data.map((d) => d.total), 1) : 1),
    [data]
  )

  const barWidth = useMemo(
    () => (data.length ? Math.max(100 / data.length - 1, 2) : 0),
    [data]
  )

  const [hovered, setHovered] = useState<{
    index: number
    key: (typeof SERIES)[number]['key']
  } | null>(null)

  const labelIndices = useMemo(() => {
    const len = data.length
    if (len <= 6) return data.map((_, i) => i)
    const step = Math.max(Math.floor(len / 5), 1)
    const indices: number[] = []
    for (let i = 0; i < len; i += step) indices.push(i)
    if (indices[indices.length - 1] !== len - 1) indices.push(len - 1)
    return indices
  }, [data])

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <div className="card__title">Loaded transfer volume</div>
          <div className="card__sub">
            {windowSize ? `Last ${windowSize} transfers` : 'Recent transfers'}
          </div>
        </div>
      </div>
      <div style={{ padding: 'var(--space-6)' }}>
        {loading ? (
          <div
            style={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 'var(--fs-100)',
            }}
          >
            Loading chart data…
          </div>
        ) : !data.length ? (
          <div
            style={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 'var(--fs-100)',
            }}
          >
            No transfer data available
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: 200 }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1000 200"
                preserveAspectRatio="none"
                style={{ overflow: 'visible', display: 'block' }}
              >
                {[0, 50, 100, 150, 200].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="1000"
                    y2={y}
                    stroke="var(--border-1)"
                    strokeWidth="1"
                  />
                ))}
                {data.map((point, i) => {
                  const x = (i / data.length) * 1000 + 2
                  const w = barWidth * 10
                  let stackY = 200
                  return (
                    <g key={point.date}>
                      {SERIES.map(({ key, color }) => {
                        const val = point[key]
                        const h = Math.max((val / maxValue) * 200, 0)
                        stackY -= h
                        return (
                          <rect
                            key={key}
                            x={x}
                            y={stackY}
                            width={w}
                            height={h}
                            fill={color}
                            opacity={hovered?.index === i && hovered.key === key ? 1 : 0.85}
                            onMouseEnter={() => setHovered({ index: i, key })}
                            onMouseLeave={() => setHovered(null)}
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </svg>

              {hovered &&
                data.length > 0 &&
                (() => {
                  const point = data[hovered.index]
                  const series = SERIES.find((s) => s.key === hovered.key)!
                  const x = (hovered.index / data.length) * 1000 + 2
                  const center = x + (barWidth * 10) / 2
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(center / 1000) * 100}%`,
                        top: 0,
                        transform: 'translate(-50%, -100%)',
                        marginTop: -6,
                        padding: '4px 8px',
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-1)',
                        borderRadius: 4,
                        fontSize: 'var(--fs-50)',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}
                    >
                      {formatDate(point.date)} · {series.label}:{' '}
                      {point[series.key].toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}
                      {unitLabel}
                    </div>
                  )
                })()}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: 'var(--fs-50)',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em',
              }}
            >
              {labelIndices.map((idx) => (
                <span key={idx}>{formatDate(data[idx].date)}</span>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-5)',
                marginTop: 'var(--space-2)',
                fontSize: 'var(--fs-50)',
                color: 'var(--text-secondary)',
              }}
            >
              {SERIES.map(({ key, color, label }) => (
                <span
                  key={key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 8,
                      borderRadius: 1,
                      background: color,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransferChart
