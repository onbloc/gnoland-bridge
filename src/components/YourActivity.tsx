import { ReactElement, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export type ActivityStatus = 'idle' | 'pending' | 'success' | 'failed'
export type ActivityStage = 0 | 1 | 2 | 3

export interface ActivityItem {
  id: string
  sourceLabel: string
  sourceColor: string
  destinationLabel: string
  destinationColor: string
  amountLabel: string
  tokenSymbol: string
  status: ActivityStatus
  stage: ActivityStage
  timeLabel: string
  fromAddress: string
  toAddress: string
  txOutHash?: string
  txInHash?: string
  txHref?: string
  txInHref?: string
  href?: string
}

const STATUS_LABEL: Record<ActivityStatus, string> = {
  idle: 'Ready',
  pending: 'Pending',
  success: 'Done',
  failed: 'Failed',
}

const STATUS_CLASS: Record<ActivityStatus, string> = {
  idle: '',
  pending: ' tag--pending',
  success: ' tag--success',
  failed: ' tag--fail',
}

const truncateMiddle = (value: string, start = 8, end = 6): string => {
  if (!value) return '-'
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

const CopyButton = ({ value }: { value: string }): ReactElement => {
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    if (!value || typeof navigator === 'undefined') return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 900)
  }

  return (
    <button
      type="button"
      className="copy-addr__btn"
      onClick={copy}
      aria-label={copied ? 'Copied address' : 'Copy address'}
      title={copied ? 'Copied' : 'Copy'}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="9" y="9" width="10" height="10" rx="1" />
        <path d="M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" />
      </svg>
    </button>
  )
}

const ChainChip = ({
  label,
  color,
}: {
  label: string
  color: string
}): ReactElement => (
  <span className="activity-chain-chip">
    <span className="dot" style={{ background: color }} />
    {label}
  </span>
)

// Mirrors PacketTracker's completedStep: stage 0 = Sent done/Relayed
// pending, 1 = Relayed done/Received pending, 2 = all done. -1 (failed,
// stage 3) intentionally excludes "Sent" from the completedStep check below
// so it falls through to the index===0 special case instead.
const getCompletedStep = (stage: ActivityStage): number =>
  stage === 2 ? 2 : stage === 1 ? 1 : stage === 0 ? 0 : -1

const stepState = (
  completedStep: number,
  stage: ActivityStage,
  index: number
): 'done' | 'active' | 'failed' | 'waiting' => {
  if (index === 0) return 'done'
  if (completedStep >= index) return 'done'
  if (stage === 3 && index === 1) return 'failed'
  if (completedStep === index - 1) return 'active'
  return 'waiting'
}

const ProgressDetail = ({ item }: { item: ActivityItem }): ReactElement => {
  const completedStep = getCompletedStep(item.stage)
  const fillWidth =
    completedStep < 1 ? '0%' : completedStep >= 2 ? '100%' : '50%'
  const steps = [
    { label: 'Sent', sub: item.txHref ? 'VIEW TX' : 'SENT' },
    {
      label: 'Relayed',
      sub:
        completedStep >= 1
          ? 'COMPLETE'
          : item.stage === 3
          ? 'FAILED'
          : 'IN PROGRESS',
    },
    {
      label: 'Received',
      sub:
        completedStep >= 2
          ? item.txInHref
            ? 'VIEW TX'
            : 'COMPLETE'
          : 'AWAITING',
    },
  ]

  return (
    <div className="progress-track activity-progress">
      <div className="progress-track__line">
        <div
          className="progress-track__line-fill"
          style={{ width: fillWidth }}
        />
      </div>
      <div className="progress-track__steps">
        {steps.map((step, index) => {
          const state = stepState(completedStep, item.stage, index)
          const cls =
            'progress-step' +
            (state === 'done'
              ? ' is-done'
              : state === 'active'
              ? ' is-active'
              : state === 'failed'
              ? ' is-failed'
              : '')
          const subCls =
            state === 'failed'
              ? 'progress-step__sub progress-step__sub--fail'
              : state === 'active' || state === 'done'
              ? 'progress-step__sub progress-step__sub--brand'
              : 'progress-step__sub progress-step__sub--muted'
          const stepHref =
            index === 0 ? item.txHref : index === 2 ? item.txInHref : undefined

          return (
            <div key={step.label} className={cls}>
              <div className="progress-step__dot">
                {state === 'done' && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                {state === 'active' && (
                  <span className="progress-step__pulse" />
                )}
                {state === 'failed' && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                )}
              </div>
              <span className="progress-step__label">{step.label}</span>
              {stepHref ? (
                <a
                  className={subCls}
                  href={stepHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {step.sub} ↗
                </a>
              ) : (
                <span className={subCls}>{step.sub}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const YourActivity = ({
  items,
  loading = false,
  error,
  emptyText = 'No activity yet',
}: {
  items: ActivityItem[]
  loading?: boolean
  error?: string
  emptyText?: string
}): ReactElement => {
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!items.length) {
      setOpenId(null)
      return
    }
    setOpenId((current) =>
      current && items.some((item) => item.id === current) ? current : null
    )
  }, [items])

  return (
    <aside className="activity-card" aria-label="Your activity">
      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Your activity</div>
            <div className="card__sub">Your last 20 transactions</div>
          </div>
          <Link to="/dashboard" className="activity-view-all">
            View all ↗
          </Link>
        </div>

        {loading ? (
          <div className="activity-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="activity-skeleton" key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="activity-empty">{error}</div>
        ) : items.length ? (
          <div className="activity-list">
            {items.map((item) => (
              <div className="activity-row-wrap" key={item.id}>
                <button
                  type="button"
                  className="activity-row activity-row--button"
                  onClick={() =>
                    setOpenId((current) =>
                      current === item.id ? null : item.id
                    )
                  }
                  aria-expanded={openId === item.id}
                >
                  <div className="activity-row__route">
                    <span className="activity-row__chains">
                      <ChainChip
                        label={item.sourceLabel}
                        color={item.sourceColor}
                      />
                      <span className="activity-row__arrow">→</span>
                      <ChainChip
                        label={item.destinationLabel}
                        color={item.destinationColor}
                      />
                    </span>
                    <span className="activity-row__time">{item.timeLabel}</span>
                  </div>

                  <div className="activity-row__amount">
                    <span className="activity-row__num">
                      {item.amountLabel}
                    </span>
                    <span className="activity-row__sym">
                      {item.tokenSymbol}
                    </span>
                  </div>

                  <div className="activity-row__meta">
                    <span className={`tag${STATUS_CLASS[item.status]}`}>
                      <span className="dot" />
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="activity-row__chev" aria-hidden="true">
                      {openId === item.id ? '⌃' : '⌄'}
                    </span>
                  </div>
                </button>

                {openId === item.id && (
                  <div className="activity-row__detail">
                    <div className="activity-row__addrs-block">
                      <div className="activity-row__addrs-row">
                        <span className="activity-row__addrs-label">From</span>
                        <span className="copy-addr mono">
                          {truncateMiddle(item.fromAddress)}
                          <CopyButton value={item.fromAddress} />
                        </span>
                      </div>
                      <div className="activity-row__addrs-row">
                        <span className="activity-row__addrs-label">To</span>
                        <span className="copy-addr mono">
                          {truncateMiddle(item.toAddress)}
                          <CopyButton value={item.toAddress} />
                        </span>
                      </div>
                    </div>
                    <ProgressDetail item={item} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="activity-empty">{emptyText}</div>
        )}
      </div>
    </aside>
  )
}

export default YourActivity
