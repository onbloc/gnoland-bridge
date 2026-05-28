import { ReactElement, useEffect, useState, useRef } from 'react'
import type { PacketDetails } from 'packages/union/graphql'

// Maps Union GraphQL status to the highest completed step index (0=Sent, 1=Relayed, 2=Received)
const STATUS_TO_STEP: Record<string, number> = {
  PACKET_SEND: 0,
  PACKET_RECV: 1,
  WRITE_ACK: 1,
  PACKET_ACK: 2,
}

const STEP_LABELS = ['Sent', 'Relayed', 'Received']

function StepSubtext({
  stepIndex,
  completedStep,
  sourceTxUrl,
}: {
  stepIndex: number
  completedStep: number
  sourceTxUrl?: string
}): ReactElement {
  if (stepIndex === 0 && completedStep >= 0 && sourceTxUrl) {
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
  return <></>
}

export default function PacketTracker({
  packetHash,
  sourceTxUrl,
}: {
  packetHash: string
  sourceTxUrl?: string
}): ReactElement {
  const [packet, setPacket] = useState<PacketDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!packetHash) return

    const poll = async (): Promise<void> => {
      try {
        const res = await fetch('https://graphql.union.build/v1/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query($h: String!) @cached(ttl:15) {
              v2_packets(args:{p_packet_hash:$h}) {
                packet_hash status
                packet_send_transaction_hash
                packet_recv_transaction_hash
                packet_ack_transaction_hash
                source_universal_chain_id
                destination_universal_chain_id
                traces { type height timestamp transaction_hash chain { universal_chain_id } }
              }
            }`,
            variables: { h: packetHash },
          }),
        })
        const json = await res.json()
        const packets = json?.data?.v2_packets
        if (packets && packets.length > 0) {
          setPacket(packets[0])
          if (packets[0].status === 'PACKET_ACK') {
            clearInterval(intervalRef.current)
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to query packet')
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 10_000)
    return (): void => clearInterval(intervalRef.current)
  }, [packetHash])

  if (!packetHash) return <></>

  const completedStep = packet ? STATUS_TO_STEP[packet.status] ?? -1 : -1

  // Line fill: 0% when nothing done, 50% after step 1, 100% when all done
  const lineFillPct =
    completedStep < 1 ? '0%' : completedStep >= 2 ? '100%' : '50%'

  return (
    <div>
      {error && (
        <div
          style={{
            fontSize: 'var(--fs-50)',
            color: 'var(--g-color-red-500)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {error}
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
            const isActive = !isDone && completedStep === i - 1
            const cls =
              'progress-step' +
              (isDone ? ' is-done' : isActive ? ' is-active' : '')
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
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  {isActive && <span className="progress-step__pulse" />}
                </div>
                <span className="progress-step__label">{label}</span>
                <StepSubtext
                  stepIndex={i}
                  completedStep={completedStep}
                  sourceTxUrl={sourceTxUrl}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-50)',
          color: 'var(--text-tertiary)',
          letterSpacing: 0,
          wordBreak: 'break-all',
          marginTop: 'var(--space-2)',
        }}
      >
        {packetHash}
      </div>
    </div>
  )
}
