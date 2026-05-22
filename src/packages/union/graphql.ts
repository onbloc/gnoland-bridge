const UNION_GRAPHQL_URL = 'https://graphql.union.build/v1/graphql'

const PACKET_DETAILS_QUERY = `
query PacketDetails($packet_hash: String!) @cached(ttl: 30) {
  v2_packets(args: {p_packet_hash: $packet_hash}) {
    packet_hash
    status
    source_universal_chain_id
    destination_universal_chain_id
    packet_send_transaction_hash
    packet_recv_transaction_hash
    packet_ack_transaction_hash
    traces {
      type
      height
      timestamp
      transaction_hash
      chain {
        universal_chain_id
      }
    }
  }
}`

export interface PacketTrace {
  type: string
  height: string
  timestamp: string
  transaction_hash: string
  chain: {
    universal_chain_id: string
  }
}

export interface PacketDetails {
  packet_hash: string
  status: string
  source_universal_chain_id: string
  destination_universal_chain_id: string
  packet_send_transaction_hash: string | null
  packet_recv_transaction_hash: string | null
  packet_ack_transaction_hash: string | null
  traces: PacketTrace[]
}

export type PacketStatus =
  | 'PACKET_SEND'
  | 'PACKET_RECV'
  | 'WRITE_ACK'
  | 'PACKET_ACK'

const STATUS_ORDER: Record<PacketStatus, number> = {
  PACKET_SEND: 0,
  PACKET_RECV: 1,
  WRITE_ACK: 2,
  PACKET_ACK: 3,
}

async function queryPacketDetails(
  packetHash: string
): Promise<PacketDetails[]> {
  const response = await fetch(UNION_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: PACKET_DETAILS_QUERY,
      variables: { packet_hash: packetHash },
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Union GraphQL request failed: ${response.status} ${response.statusText}`
    )
  }

  const result = await response.json()
  if (result.errors) {
    throw new Error(`Union GraphQL errors: ${JSON.stringify(result.errors)}`)
  }

  return result.data.v2_packets
}

export async function waitForPacketStatus(
  packetHash: string,
  targetStatus: PacketStatus,
  timeoutMs = 300_000,
  pollIntervalMs = 15_000
): Promise<PacketDetails> {
  const targetOrder = STATUS_ORDER[targetStatus]
  const start = Date.now()
  let lastStatus = ''

  while (Date.now() - start < timeoutMs) {
    try {
      const packets = await queryPacketDetails(packetHash)
      if (packets && packets.length > 0) {
        const packet = packets[0]
        if (packet.status !== lastStatus) {
          lastStatus = packet.status
          const elapsed = Math.round((Date.now() - start) / 1000)
          const traceCount = packet.traces?.length ?? 0
          console.log(
            `[Union] Packet ${packetHash.slice(0, 10)}... status: ${
              packet.status
            } (${traceCount} traces, ${elapsed}s elapsed)`
          )
        }
        if (STATUS_ORDER[packet.status as PacketStatus] >= targetOrder) {
          return packet
        }
      } else {
        const elapsed = Math.round((Date.now() - start) / 1000)
        console.log(
          `[Union] Packet ${packetHash.slice(
            0,
            10
          )}... not indexed yet (${elapsed}s elapsed)`
        )
      }
    } catch (err) {
      console.warn(
        `[Union] Query error: ${err instanceof Error ? err.message : err}`
      )
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(
    `Packet ${packetHash} did not reach ${targetStatus} within ${
      timeoutMs / 1000
    }s (last status: ${lastStatus || 'not found'})`
  )
}

export async function waitForPacketCompletion(
  packetHash: string,
  timeoutMs = 300_000,
  pollIntervalMs = 15_000
): Promise<PacketDetails> {
  return waitForPacketStatus(
    packetHash,
    'PACKET_ACK',
    timeoutMs,
    pollIntervalMs
  )
}
