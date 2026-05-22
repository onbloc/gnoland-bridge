import { ReactElement } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import type { Transfer } from 'packages/union/dashboard-graphql'
import ChainBadge from './ChainBadge'
import StatusBadge from './StatusBadge'

dayjs.extend(relativeTime)

const truncateAddr = (addr: string): string => {
  if (!addr) return '-'
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

const formatAmount = (amount: string, decimals: number): string => {
  if (!amount) return '-'
  const num = Number(amount) / Math.pow(10, decimals)
  if (num === 0) return '0'
  if (num < 0.001) return '< 0.001'
  return num.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

const formatTime = (timestamp: string | null): string => {
  if (!timestamp) return '-'
  return dayjs(timestamp).fromNow()
}

const TransferTable = ({
  transfers,
  loading = false,
  hasNextPage,
  hasPrevPage,
  currentPage,
  onNext,
  onPrev,
}: {
  transfers: Transfer[]
  loading?: boolean
  hasNextPage: boolean
  hasPrevPage: boolean
  currentPage: number
  onNext: () => void
  onPrev: () => void
}): ReactElement => (
  <div className="card">
    <div className="card__header">
      <div>
        <div className="card__title">Transfer history</div>
      </div>
    </div>

    {loading ? (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          padding: 'var(--space-4) var(--space-6)',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 40,
              background: 'var(--bg-surface-1)',
              borderRadius: 'var(--r-1)',
            }}
          />
        ))}
      </div>
    ) : !transfers.length ? (
      <div
        style={{
          padding: 'var(--space-8) var(--space-6)',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--fs-100)',
        }}
      >
        No transfers found
      </div>
    ) : (
      <>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Token</th>
                <th className="num">Amount</th>
                <th>From</th>
                <th>To</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.packet_hash}>
                  <td className="mono-cell" style={{ whiteSpace: 'nowrap' }}>
                    {formatTime(t.transfer_send_timestamp)}
                  </td>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {t.token_symbol || '-'}
                  </td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {formatAmount(t.base_amount, t.token_decimals)}
                  </td>
                  <td>
                    <ChainBadge chainId={t.source_universal_chain_id} />
                  </td>
                  <td>
                    <ChainBadge chainId={t.destination_universal_chain_id} />
                  </td>
                  <td
                    className="mono-cell"
                    style={{ whiteSpace: 'nowrap' }}
                    title={t.sender_display}
                  >
                    {truncateAddr(t.sender_display)}
                  </td>
                  <td
                    className="mono-cell"
                    style={{ whiteSpace: 'nowrap' }}
                    title={t.receiver_display}
                  >
                    {truncateAddr(t.receiver_display)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge success={t.success} />
                  </td>
                  <td>
                    <a
                      className="text-link mono"
                      href={`https://app.union.build/explorer/transfers/${t.packet_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 'var(--fs-50)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      View ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="between"
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--border-1)',
          }}
        >
          <button
            className="btn btn--ghost btn--sm"
            disabled={!hasPrevPage}
            onClick={onPrev}
          >
            ← Previous
          </button>
          <span
            className="mono"
            style={{
              fontSize: 'var(--fs-50)',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Page {currentPage + 1}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            disabled={!hasNextPage}
            onClick={onNext}
          >
            Next →
          </button>
        </div>
      </>
    )}
  </div>
)

export default TransferTable
