import { ReactElement } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import {
  getRelayerTransferAmount,
  getRelayerTransferTokenSymbol,
  getTxExplorerUrl,
  type RelayerTransfer,
  type RelayerTransferStatus,
} from 'packages/relayer-api'
import ChainBadge from './ChainBadge'
import StatusBadge from './StatusBadge'

dayjs.extend(relativeTime)

const truncateAddr = (addr: string): string => {
  if (!addr) return '-'
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

const TxLink = ({
  hash,
  status,
}: {
  hash: string
  status: RelayerTransferStatus
}): ReactElement => {
  if (!hash) {
    // status 3 = Failed - nothing will ever arrive for this leg, so don't
    // imply it's still on the way.
    return <>{status === 3 ? '-' : 'AWAITING'}</>
  }
  return (
    <a
      className="mono text-link"
      style={{
        fontSize: 'var(--fs-50)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
      href={getTxExplorerUrl(hash)}
      target="_blank"
      rel="noreferrer"
      title={hash}
    >
      VIEW TX ↗
    </a>
  )
}

const formatTime = (timestamp: string): string => {
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
  transfers: RelayerTransfer[]
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
                <th>Outbound</th>
                <th>Inbound</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.packet_hash}>
                  <td className="mono-cell" style={{ whiteSpace: 'nowrap' }}>
                    {formatTime(transfer.created_at)}
                  </td>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {getRelayerTransferTokenSymbol(transfer)}
                  </td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {getRelayerTransferAmount(transfer)}
                  </td>
                  <td>
                    <ChainBadge chainId={transfer.src_chain_id} />
                  </td>
                  <td>
                    <ChainBadge chainId={transfer.dst_chain_id} />
                  </td>
                  <td
                    className="mono-cell"
                    style={{ whiteSpace: 'nowrap' }}
                    title={transfer.from_address}
                  >
                    {truncateAddr(transfer.from_address)}
                  </td>
                  <td
                    className="mono-cell"
                    style={{ whiteSpace: 'nowrap' }}
                    title={transfer.to_address}
                  >
                    {truncateAddr(transfer.to_address)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={transfer.status} />
                  </td>
                  <td className="mono-cell" style={{ whiteSpace: 'nowrap' }}>
                    <TxLink hash={transfer.tx_out} status={transfer.status} />
                  </td>
                  <td className="mono-cell" style={{ whiteSpace: 'nowrap' }}>
                    <TxLink hash={transfer.tx_in} status={transfer.status} />
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
