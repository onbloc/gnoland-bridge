import { Fragment, ReactElement, useEffect, useState, useRef } from 'react'
import type { PacketDetails, PacketStatus } from 'packages/union/graphql'

const STEPS: { status: PacketStatus; label: string }[] = [
  { status: 'PACKET_SEND', label: 'Sent' },
  { status: 'PACKET_RECV', label: 'Received' },
  { status: 'WRITE_ACK', label: 'Acknowledged' },
  { status: 'PACKET_ACK', label: 'Completed' },
]

const STATUS_ORDER: Record<string, number> = {
  PACKET_SEND: 0,
  PACKET_RECV: 1,
  WRITE_ACK: 2,
  PACKET_ACK: 3,
}

// Mirrors the success badge at the top of the Finish screen: a thin
// brand-green outline circle that fills with a brand-green check when
// the step has been reached.
function StepDot({ reached }: { reached: boolean }): ReactElement {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
      style={{ border: '1.5px solid var(--bg-brand)' }}
    >
      {reached && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bg-brand)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </div>
  )
}

export default function PacketTracker({
  packetHash,
}: {
  packetHash: string
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

  const currentOrder = packet ? STATUS_ORDER[packet.status] ?? -1 : -1

  return (
    <div className="mt-4">
      <div className="text-gray-400 text-xs mb-3">Packet Tracking</div>

      {error && <div className="text-bridge-red text-xs mb-3">{error}</div>}

      <div className="flex items-start mb-4 px-3">
        {STEPS.map((step, i) => {
          const stepOrder = STATUS_ORDER[step.status]
          const reached = currentOrder >= stepOrder
          // Bar between step i and i+1 lights up once the chain has
          // progressed past step i (i.e. reached i+1 or beyond).
          const barReached = currentOrder > stepOrder
          return (
            <Fragment key={step.status}>
              <div className="flex flex-col items-center shrink-0">
                <StepDot reached={reached} />
                <span
                  className={`text-[10px] mt-1 ${
                    reached ? 'text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  // h-7 matches the dot diameter so the line lands on the
                  // dot's vertical centerline without manual margins.
                  className="flex-1 h-7 flex items-center mx-2"
                >
                  <div
                    className="w-full h-px"
                    style={{
                      backgroundColor: barReached
                        ? 'var(--bg-brand)'
                        : 'var(--border-2)',
                    }}
                  />
                </div>
              )}
            </Fragment>
          )
        })}
      </div>

      <div className="text-text-tertiary text-[10px] font-mono break-all">
        {packetHash}
      </div>
    </div>
  )
}
