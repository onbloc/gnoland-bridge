import { ReactElement, useEffect, useState, useRef } from 'react'
import {
  fetchPacketHashByTxHash,
  fetchRelayerStatus,
  getTxExplorerUrl,
  isRelayerTransferTerminal,
  type RelayerTransfer,
} from 'packages/relayer-api'

const STEP_LABELS = ['Sent', 'Relayed', 'Received']

function StepSubtext({
  stepIndex,
  completedStep,
  sourceTxUrl,
  destTxUrl,
}: {
  stepIndex: number
  completedStep: number
  sourceTxUrl?: string
  destTxUrl?: string
}): ReactElement {
  if (stepIndex === 0 && sourceTxUrl) {
    return (
      <a
        href={sourceTxUrl}
        target="_blank"
        rel="noreferrer"
        className="progress-step__sub progress-step__sub--brand"
      >
        View Tx ↗
      </a>
    )
  }
  if (stepIndex === 1 && completedStep >= 1) {
    return (
      <span className="progress-step__sub progress-step__sub--muted">
        Complete
      </span>
    )
  }
  if (stepIndex === 2 && completedStep >= 2 && destTxUrl) {
    return (
      <a
        href={destTxUrl}
        target="_blank"
        rel="noreferrer"
        className="progress-step__sub progress-step__sub--brand"
      >
        View Tx ↗
      </a>
    )
  }
  return <></>
}

export default function PacketTracker({
  packetHash,
  sourceTxUrl,
  senderAddress,
  sourceTxHash,
}: {
  packetHash: string
  sourceTxUrl?: string
  // packetHash may be a client-side estimate that drifts from what the chain
  // actually commits (see fetchPacketHashByTxHash). When present, these let
  // the poll loop below re-resolve the real hash from the indexed source tx.
  senderAddress?: string
  sourceTxHash?: string
}): ReactElement {
  const [correctedHash, setCorrectedHash] = useState<string | null>(null)
  const [transfer, setTransfer] = useState<RelayerTransfer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const resolvedPacketHash = correctedHash ?? packetHash

  useEffect(() => {
    if (!resolvedPacketHash) return

    const poll = async (): Promise<void> => {
      try {
        const result = await fetchRelayerStatus(resolvedPacketHash)
        setTransfer(result)
        setError(null)
        if (isRelayerTransferTerminal(result)) {
          clearInterval(intervalRef.current)
        }
      } catch (e) {
        // The relayer backend 404s until it has indexed this packet - that's
        // expected right after the tx lands, so keep polling silently. Our
        // off-chain packetHash estimate can also just be wrong (drift from
        // what the chain actually commits) - if so it will 404 forever, so
        // try resolving the real hash from the indexed source tx instead.
        if (e instanceof Error && /404/.test(e.message)) {
          if (senderAddress && sourceTxHash) {
            const indexedHash = await fetchPacketHashByTxHash(
              senderAddress,
              sourceTxHash,
              1,
              0
            ).catch(() => null)
            if (indexedHash && indexedHash !== resolvedPacketHash) {
              setCorrectedHash(indexedHash)
            }
          }
          return
        }
        setError(e instanceof Error ? e.message : 'Failed to query transfer')
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 5_000)
    return (): void => clearInterval(intervalRef.current)
  }, [resolvedPacketHash, senderAddress, sourceTxHash])

  if (!packetHash) return <></>

  const destTxUrl = transfer?.tx_in ? getTxExplorerUrl(transfer.tx_in) : undefined

  const failed = transfer?.status === 3
  const completedStep =
    transfer?.status === 2
      ? 2
      : transfer?.status === 1
      ? 1
      : transfer?.status === 0
      ? 0
      : -1

  // Line fill: 0% when nothing done, 50% after step 1, 100% when all done
  const lineFillPct =
    completedStep < 1 ? '0%' : completedStep >= 2 ? '100%' : '50%'

  return (
    <div>
      {(error || failed) && (
        <div
          style={{
            fontSize: 'var(--fs-50)',
            color: 'var(--g-color-red-500)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {error || transfer?.err_msg || 'Transfer failed'}
        </div>
      )}

      <div className="progress-track">
        <div className="progress-track__line">
          <div
            className="progress-track__line-fill"
            style={{ width: lineFillPct }}
          />
        </div>
        <div className="progress-track__steps">
          {STEP_LABELS.map((label, i) => {
            const isDone = completedStep >= i
            const isFailed = failed && i === 1 && !isDone
            const isActive = !isDone && !isFailed && completedStep === i - 1
            const cls =
              'progress-step' +
              (isDone
                ? ' is-done'
                : isFailed
                ? ' is-failed'
                : isActive
                ? ' is-active'
                : '')
            return (
              <div key={label} className={cls}>
                <div className="progress-step__dot">
                  {isDone && (
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
                  {isFailed && (
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
                  {isActive && <span className="progress-step__pulse" />}
                </div>
                <span className="progress-step__label">{label}</span>
                <StepSubtext
                  stepIndex={i}
                  completedStep={completedStep}
                  sourceTxUrl={sourceTxUrl}
                  destTxUrl={destTxUrl}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
