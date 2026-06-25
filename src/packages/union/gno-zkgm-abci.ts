import { decodeAbiParameters, parseAbiParameters } from 'viem'

// Same-origin proxy path; the Vercel rewrite and Vite dev proxy forward
// it to the gno-ibc devnet, so HTTPS pages don't hit mixed-content blocks.
const DEFAULT_RPC_URL = '/gno-rpc'

const getRpcUrl = (): string =>
  import.meta.env.VITE_GNO_RPC_URL || DEFAULT_RPC_URL

type AbciResponse = {
  result?: {
    response?: {
      ResponseBase?: {
        Error?: { '@type'?: string } | null
        Data?: string | null
        Log?: string
      }
    }
  }
  error?: { message?: string }
}

const base64ToUtf8 = (b64: string): string => {
  const bin = atob(b64)
  let out = ''
  for (let i = 0; i < bin.length; i += 1) {
    out += String.fromCharCode(bin.charCodeAt(i))
  }
  return out
}

const base64ToHex = (b64: string): string => {
  const bin = atob(b64)
  let out = ''
  for (let i = 0; i < bin.length; i += 1) {
    out += bin.charCodeAt(i).toString(16).padStart(2, '0')
  }
  return out
}

const utf8ToHex = (s: string): string => {
  const bytes = new TextEncoder().encode(s)
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

type QEvalResult = {
  dataUtf8: string | null
  errorType: string | null
  log: string
}

// Evaluate a `<pkgpath>.<expression>` on the gno VM via the ABCI gateway.
// The cosmwasm-style `/store/main/key` query path isn't exposed by this
// chain build, so all read-side probes route through vm/qeval instead.
const vmQEval = async (expr: string): Promise<QEvalResult> => {
  const dataHex = utf8ToHex(expr)
  const url = `${getRpcUrl()}/abci_query?path=%22vm%2Fqeval%22&data=0x${dataHex}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`vm/qeval HTTP ${res.status}`)
  }
  const json: AbciResponse = await res.json()
  if (json.error) {
    throw new Error(
      `vm/qeval transport error: ${json.error.message ?? 'unknown'}`
    )
  }
  const r = json.result?.response?.ResponseBase
  return {
    dataUtf8: r?.Data ? base64ToUtf8(r.Data) : null,
    errorType: r?.Error?.['@type'] ?? null,
    log: r?.Log ?? '',
  }
}

// vm/qeval surfaces a single string return value as `("0x..." string)`.
// Pull the inner hex literal so it can be ABI-decoded.
const extractHexString = (data: string): `0x${string}` | null => {
  const m = data.match(/\("(0x[0-9a-fA-F]*)"\s+string\)/)
  return m ? (m[1] as `0x${string}`) : null
}

export type ChannelInfo = {
  channelId: number
  // ChannelState enum from gno.land/r/core/ibc/v1/core/types.gno:
  // 0=Unknown 1=Init 2=TryOpen 3=Open 4=Closed
  state: number
  connectionId: number
  counterpartyChannelId: number
  counterpartyPortId: `0x${string}`
  version: string
}

// ABI shape of `gno.land/r/core/ibc/v1/core.QueryChannel(id)` return value.
// Mirrors the on-chain Channel struct: (state, connectionId,
// counterpartyChannelId, counterpartyPortId, version).
const CHANNEL_ABI = parseAbiParameters(
  '(uint8 state, uint32 connectionId, uint32 counterpartyChannelId, bytes counterpartyPortId, string version)'
)

// Probe whether a channel is registered at the gno-ibc core realm and pull
// its full state. Returns null when the channel id is not allocated (the
// chain answers with `/abci.StringError`).
export const queryChannelState = async (
  channelId: number
): Promise<ChannelInfo | null> => {
  const r = await vmQEval(
    `gno.land/r/onbloc/ibc/union/core.QueryChannel(${channelId})`
  )
  if (r.errorType) return null
  if (!r.dataUtf8) return null
  const hex = extractHexString(r.dataUtf8)
  if (!hex) return null
  const [decoded] = decodeAbiParameters(CHANNEL_ABI, hex)
  return {
    channelId,
    state: Number(decoded.state),
    connectionId: Number(decoded.connectionId),
    counterpartyChannelId: Number(decoded.counterpartyChannelId),
    counterpartyPortId: decoded.counterpartyPortId,
    version: decoded.version,
  }
}

export type DiscoveredChannel = ChannelInfo

// Walk channel ids 1..maxId and return the ones that have on-chain state.
export const findActiveChannels = async (
  maxId = 16
): Promise<DiscoveredChannel[]> => {
  const found: DiscoveredChannel[] = []
  for (let id = 1; id <= maxId; id += 1) {
    try {
      const info = await queryChannelState(id)
      if (info) found.push(info)
    } catch (err) {
      console.warn(`[gno-ibc] channel probe id=${id} failed`, err)
    }
  }
  return found
}

// Tendermint `/tx` lookup response (only the bits we read).
type TxLookupResponse = {
  result?: {
    tx_result?: {
      ResponseBase?: {
        Events?: Array<{
          type?: string
          attrs?: Array<{ key?: string; value?: string }>
        }>
      }
    }
  }
  error?: { message?: string }
}

// Look up a gno tx by hash and read the on-chain PacketSend event's
// `packet_hash` attribute. This is the authoritative cross-chain packet
// hash (chain computes it via `CommitPacket(Packet)` = `keccak256(abi.
// encode([Packet]))`); preferring it over a client-side estimate avoids
// any encoding-parity drift between the frontend and the chain.
// `txHash` accepts either Adena-style base64 (e.g. "mXQkuhL8...") or
// 0x-prefixed hex. The request retries a few times because Tendermint's
// tx index has a small lag between broadcast commit and queryability.
export const fetchPacketHashFromTx = async (
  txHash: string,
  retries = 6,
  delayMs = 800
): Promise<`0x${string}` | null> => {
  const hashHex = txHash.startsWith('0x') ? txHash : `0x${base64ToHex(txHash)}`
  const url = `${getRpcUrl()}/tx?hash=${hashHex}`
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const json: TxLookupResponse = await res.json()
        const events = json?.result?.tx_result?.ResponseBase?.Events ?? []
        for (const ev of events) {
          if (ev?.type !== 'PacketSend') continue
          for (const a of ev.attrs ?? []) {
            if (a?.key === 'packet_hash' && typeof a.value === 'string') {
              return a.value as `0x${string}`
            }
          }
        }
      }
    } catch (err) {
      // Network glitch on a single attempt is fine; fall through to retry.
      console.warn('[gno-direct] tx lookup attempt failed', err)
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return null
}
