import { ReactElement, useEffect, useState, useRef } from 'react'
import {
  fetchRelayerStatus,
  findMatchingWalletTransfer,
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
  receiverAddress,
  amount,
  sourceChainId,
  destinationChainId,
}: {
  packetHash: string
  sourceTxUrl?: string
  senderAddress?: string
  sourceTxHash?: string
  // Same match criteria Your Activity (useWalletActivity) uses to find the
  // tracked transfer in the wallet's indexed history. packetHash is a
  // client-side estimate that can drift from what the chain actually
  // commits, so matching progressively (packetHash -> tx_out -> these
  // sender/receiver/amount/chain fields) recovers even when the hash
  // estimate never resolves - a single direct /status/{packetHash} lookup
  // can't.
  receiverAddress?: string
  amount?: string
  sourceChainId?: string
  destinationChainId?: string
}): ReactElement {
  const [transfer, setTransfer] = useState<RelayerTransfer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!packetHash) return

    const poll = async (): Promise<void> => {
      try {
        const result = senderAddress
          ? await findMatchingWalletTransfer({
              address: senderAddress,
              packetHash,
              txHash: sourceTxHash,
              senderAddress,
              receiverAddress,
              amount,
              sourceChainId,
              destinationChainId,
            })
          : await fetchRelayerStatus(packetHash).catch(() => null)

        // Not indexed yet - expected right after the tx lands, keep polling.
        if (!result) return

        setTransfer(result)
        setError(null)
        if (isRelayerTransferTerminal(result)) {
          clearInterval(intervalRef.current)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to query transfer')
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 5_000)

    // Your Activity's react-query polling refetches on window focus by
    // default - mirror that here so switching back to this tab catches up
    // immediately instead of waiting out the rest of the 5s interval.
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)

    return (): void => {
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [
    packetHash,
    senderAddress,
    sourceTxHash,
    receiverAddress,
    amount,
    sourceChainId,
    destinationChainId,
  ])

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
