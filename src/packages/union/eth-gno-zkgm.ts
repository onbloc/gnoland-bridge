import { Ucs03, Ucs05 } from '@unionlabs/sdk'
import { Instruction, PacketFromHex, Ucs03FromHex } from '@unionlabs/sdk/Ucs03'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbiParameters,
} from 'viem'

import { utf8ToHex } from './gno-abi'
import { encodeTokenOrderV2Hex } from './gno-token-order'
import {
  ETH_ZKGM_SEPOLIA_ADDRESS,
  TOKEN_ORDER_KIND_ESCROW,
  TOKEN_ORDER_KIND_UNESCROW,
} from './gno-zkgm-constants'

// Wire-level packet hash for explorer correlation. Mirrors the eth-a1-hook
// hash computation: keccak of the ABI-encoded outbound packet array using the
// same TokenOrderV2 operand + Instruction frame that ZKGM.send re-derives.
export type EthToGnoDirectTxResult = {
  hash: `0x${string}`
  preparedRequest: {
    to: `0x${string}`
    data: `0x${string}`
    value: bigint
  }
}

const TIMEOUT_HOURS = 24n
const NANOS_PER_HOUR = 3_600n * 1_000_000_000n

// ZKGM contract `send` ABI extracted from @unionlabs/sdk Ucs03.Abi. Hand-rolled
// here so we don't pull the entire ChainRegistry/EvmZkgmClient stack just for
// calldata encoding (the SDK builder requires a registered destination chain
// and gnoland isn't in the mainnet registry).
const ZKGM_SEND_ABI = [
  {
    type: 'function',
    name: 'send',
    stateMutability: 'payable',
    inputs: [
      { name: 'channelId', type: 'uint32' },
      { name: 'timeoutHeight', type: 'uint64' },
      { name: 'timeoutTimestamp', type: 'uint64' },
      { name: 'salt', type: 'bytes32' },
      {
        name: 'instruction',
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'opcode', type: 'uint8' },
          { name: 'operand', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
] as const

const bytesToHex32 = (bytes: Uint8Array): `0x${string}` =>
  `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as `0x${string}`

const toBaseTokenHex = (baseToken: string): `0x${string}` => {
  if (!baseToken.startsWith('0x')) {
    throw new Error(
      `EVM-side baseToken must be a 0x-prefixed ERC20 address: ${baseToken}`
    )
  }
  return baseToken as `0x${string}`
}

// quoteToken on the gno side is a denom string (e.g. "ugnot"). gno-ibc decodes
// it as raw bytes and matches against denom storage, so a utf8 encoding is the
// right wire form. A passthrough 0x... is also allowed for callers that prefer
// to pre-encode.
const toQuoteTokenHex = (quoteToken: string): `0x${string}` =>
  quoteToken.startsWith('0x')
    ? (quoteToken as `0x${string}`)
    : utf8ToHex(quoteToken)

export type EthToGnoDirectInput = {
  src: 'ethereum'
  dest: 'gnoland'
  sender: `0x${string}`
  rcpt: string
  amount: bigint
  baseToken: string
  quoteToken: string
  solverMetadata: string
  // Which side of the pair baseToken is: 'unescrow' when eth holds a
  // wrapped ERC20 being sent back to reclaim a gno-native asset (ugnot/GRCT
  // family), 'escrow' when eth holds the real asset (ERCT family - lock the
  // native ERC20, mint a wrapped voucher on gno).
  kind: 'escrow' | 'unescrow'
  // Both channel ids come from the route entry so the wire-level send args,
  // the packet hash, and the route table cannot drift out of sync.
  sourceChannelId: number
  destinationChannelId: number
}

// TokenOrderV2 (Kind=ESCROW or UNESCROW, per input.kind) single-hop ZKGM send
// from EVM (Sepolia) into Gno. For UNESCROW (ugnot/GRCT family): the wrapped
// ERC20 minted on EVM during ESCROW is sent back to ZKGM, which burns it and
// triggers a PacketRecv on gno that releases the escrowed native asset to
// `rcpt`. For ESCROW (ERCT family): a real ERC20 is locked into ZKGM, which
// triggers a PacketRecv on gno that mints/credits a voucher to `rcpt`.
export const makeEthToGnoDirectTransaction = async (
  input: EthToGnoDirectInput
): Promise<EthToGnoDirectTxResult> => {
  const {
    sender,
    rcpt,
    amount,
    baseToken,
    quoteToken,
    solverMetadata,
    kind,
    sourceChannelId,
    destinationChannelId,
  } = input

  if (!Number.isInteger(sourceChannelId) || sourceChannelId < 1) {
    throw new Error(
      `Invalid sourceChannelId for EVM->Gno direct flow: ${sourceChannelId}`
    )
  }
  if (!Number.isInteger(destinationChannelId) || destinationChannelId < 1) {
    throw new Error(
      `Invalid destinationChannelId for EVM->Gno direct flow: ${destinationChannelId}`
    )
  }

  const saltBytes = new Uint8Array(32)
  crypto.getRandomValues(saltBytes)
  const rawSalt = bytesToHex32(saltBytes)

  // ZKGM contract derives `keccak256(msg.sender || rawSalt)` and stores that
  // as the packet salt on-chain. Mirroring it here keeps the off-chain
  // packetHash aligned with what voyager / Union explorer see.
  const senderHex = sender.replace(/^0x/, '')
  const saltHex = rawSalt.replace(/^0x/, '')
  const derivedSalt = keccak256(`0x${senderHex}${saltHex}` as `0x${string}`)

  const nowNs = BigInt(Date.now()) * 1_000_000n
  const timeoutTimestampNs = nowNs + TIMEOUT_HOURS * NANOS_PER_HOUR

  const metadataHex: `0x${string}` | '0x' = solverMetadata
    ? solverMetadata.startsWith('0x')
      ? (solverMetadata as `0x${string}`)
      : utf8ToHex(solverMetadata)
    : '0x'

  const resolvedKind =
    kind === 'escrow' ? TOKEN_ORDER_KIND_ESCROW : TOKEN_ORDER_KIND_UNESCROW

  const operandHex = await encodeTokenOrderV2Hex({
    sender: Ucs05.EvmDisplay.make({ address: sender }),
    receiver: Ucs05.CosmosDisplay.make({
      address: rcpt as `${string}1${string}`,
    }),
    baseToken: toBaseTokenHex(baseToken),
    baseAmount: amount,
    quoteToken: toQuoteTokenHex(quoteToken),
    quoteAmount: amount,
    kind: resolvedKind,
    metadata: metadataHex,
  })

  // ZKGM.send signature: (channelId, timeoutHeight, timeoutTimestamp, salt,
  // (version, opcode, operand)). version=2 / opcode=3 mark a TokenOrderV2.
  // rawSalt is what the contract expects; it computes derivedSalt internally.
  const data = encodeFunctionData({
    abi: ZKGM_SEND_ABI,
    functionName: 'send',
    args: [
      sourceChannelId,
      0n,
      timeoutTimestampNs,
      rawSalt,
      { version: 2, opcode: 3, operand: operandHex },
    ],
  })

  // Cross-chain packet hash. ZkgmPacket frames the TokenOrderV2 in a v0/op2
  // outer Instruction (the Batch/forwarding envelope ZKGM internally re-wraps
  // around any single-instruction submission). Matches the hash voyager uses
  // to correlate Send <-> Recv across chains.
  const packetHex = await Effect.runPromise(
    Effect.gen(function* () {
      const innerInstruction = yield* Schema.decode(Ucs03.TokenOrderV2)({
        _tag: '@unionlabs/sdk/Ucs03/TokenOrder',
        opcode: 3,
        version: 2,
        operand: [
          yield* Ucs05.anyDisplayToZkgm(
            Ucs05.EvmDisplay.make({ address: sender })
          ),
          yield* Ucs05.anyDisplayToZkgm(
            Ucs05.CosmosDisplay.make({
              address: rcpt as `${string}1${string}`,
            })
          ),
          toBaseTokenHex(baseToken),
          amount,
          toQuoteTokenHex(quoteToken),
          amount,
          resolvedKind,
          metadataHex,
        ],
      })
      return yield* Schema.encode(PacketFromHex)(
        Ucs03.Packet.make({
          salt: derivedSalt,
          path: 0n,
          instruction: Instruction.make({
            opcode: 2,
            version: 0,
            operand: yield* Schema.encode(Ucs03FromHex)(innerInstruction),
          }),
        })
      )
    })
  )

  const packetAbi = parseAbiParameters(
    '(uint32 sourceChannelId, uint32 destinationChannelId, bytes data, uint64 timeoutHeight, uint64 timeoutTimestamp)[]'
  )
  const raw = encodeAbiParameters(packetAbi, [
    [
      {
        sourceChannelId,
        destinationChannelId,
        data: packetHex,
        timeoutHeight: 0n,
        timeoutTimestamp: timeoutTimestampNs,
      },
    ],
  ])
  const hash = keccak256(raw)

  return {
    hash,
    preparedRequest: {
      to: ETH_ZKGM_SEPOLIA_ADDRESS,
      data,
      value: 0n,
    },
  }
}
