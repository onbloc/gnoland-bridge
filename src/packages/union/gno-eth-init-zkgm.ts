import { Ucs03, Ucs05 } from '@unionlabs/sdk'
import { Instruction, PacketFromHex } from '@unionlabs/sdk/Ucs03'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { encodeAbiParameters, keccak256, parseAbiParameters } from 'viem'

import { stripHexPrefix, utf8ToHex } from './gno-abi'
import { encodeTokenOrderV2Hex } from './gno-token-order'
import {
  GNO_DIRECT_GAS_FEE,
  GNO_INIT_GAS_WANTED,
  GNO_ZKGM_REALM_PATH,
  INSTR_VERSION_2,
  OP_TOKEN_ORDER,
  RAW_SEND_FUNC,
  TOKEN_ORDER_KIND_INITIALIZE,
} from './gno-zkgm-constants'
import { GnoDirectTxResult, GnoVmCallMessage } from './gno-zkgm-types'

const TIMEOUT_HOURS = 24n
const NANOS_PER_HOUR = 3_600n * 1_000_000_000n

const ZERO_EVM_ADDRESS = '0x0000000000000000000000000000000000000000' as const

const bytesToHexNoPrefix = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const toBaseTokenHex = (baseToken: string): `0x${string}` =>
  baseToken.startsWith('0x')
    ? (baseToken as `0x${string}`)
    : utf8ToHex(baseToken)

const toQuoteTokenHex = (quoteToken: string): `0x${string}` => {
  if (!quoteToken) return ZERO_EVM_ADDRESS
  return quoteToken.startsWith('0x')
    ? (quoteToken as `0x${string}`)
    : utf8ToHex(quoteToken)
}

const normalizeOperandHexOverride = (raw: string | undefined): string => {
  const trimmed = raw?.trim()
  if (!trimmed) return ''
  const withoutPrefix = stripHexPrefix(trimmed)
  if (!/^[0-9a-fA-F]*$/.test(withoutPrefix)) {
    throw new Error('INITIALIZE operand override must be hex.')
  }
  if (withoutPrefix.length % 2 !== 0) {
    throw new Error('INITIALIZE operand override must have an even hex length.')
  }
  return withoutPrefix
}

export type GnoToEthInitInput = {
  src: 'gnoland'
  dest: 'ethereum' | 'base'
  sender: string
  // EVM recipient for the initial quote amount. The gno-ibc send guide uses
  // the Union authority EOA here.
  receiver?: string
  // Source denom on Gno (e.g. "ugnot").
  baseToken: string
  // Native amount to escrow and mint on the destination chain. For native
  // INITIALIZE, gno-ibc requires this to match the m_call send coin exactly.
  amount: bigint
  // Predicted CREATE2 wrapper address on the destination chain. The EVM ZKGM
  // verifies the deploy against this value, so a mismatch aborts the order.
  // Pass the route's `quoteToken` to align with subsequent ESCROW transfers.
  quoteToken: string
  // ABI-encoded TokenMetadata bytes (implementation + initializer).
  metadataHex: `0x${string}`
  // Optional raw TokenOrderV2 operand. When set, it becomes the SendRaw final
  // argument and bypasses client-side TokenOrderV2 encoding.
  operandHexOverride?: string
  sourceChannelId: number
  destinationChannelId: number
}

// TokenOrderV2 (Kind=INITIALIZE) ZKGM send via /vm.m_call -> RawSend wrapper.
// Mirrors makeGnoDirectToEthTransaction (ESCROW), with Kind=INITIALIZE and a
// populated metadata field that the EVM-side ZKGM unpacks to deploy the
// wrapped ERC20 via CREATE2.
export const makeGnoDirectToEthInitializeTransaction = async (
  input: GnoToEthInitInput
): Promise<GnoDirectTxResult> => {
  const {
    sender,
    receiver,
    baseToken,
    amount,
    quoteToken,
    metadataHex,
    operandHexOverride,
    sourceChannelId,
    destinationChannelId,
  } = input

  if (!Number.isInteger(sourceChannelId) || sourceChannelId < 1) {
    throw new Error(
      `Invalid sourceChannelId for Gno->EVM init flow: ${sourceChannelId}`
    )
  }
  if (!Number.isInteger(destinationChannelId) || destinationChannelId < 1) {
    throw new Error(
      `Invalid destinationChannelId for Gno->EVM init flow: ${destinationChannelId}`
    )
  }
  const rawOperandHex = normalizeOperandHexOverride(operandHexOverride)

  if (!rawOperandHex && (!metadataHex || metadataHex === '0x')) {
    throw new Error(
      'INITIALIZE metadata is empty. Provide the encoded TokenMetadata bytes.'
    )
  }
  if (amount <= 0n) {
    throw new Error(`INITIALIZE amount must be greater than zero: ${amount}`)
  }

  const saltBytes = new Uint8Array(32)
  crypto.getRandomValues(saltBytes)
  const saltHex = bytesToHexNoPrefix(saltBytes)
  const rawSalt: `0x${string}` = `0x${saltHex}`

  const nowNs = BigInt(Date.now()) * 1_000_000n
  const timeoutTimestampNs = nowNs + TIMEOUT_HOURS * NANOS_PER_HOUR

  const baseTokenHex = toBaseTokenHex(baseToken)
  const quoteTokenHex = toQuoteTokenHex(quoteToken)

  const receiverHex: `0x${string}` =
    receiver && receiver.startsWith('0x')
      ? (receiver as `0x${string}`)
      : ZERO_EVM_ADDRESS

  const operandHex =
    rawOperandHex ||
    stripHexPrefix(
      await encodeTokenOrderV2Hex({
        sender: Ucs05.CosmosDisplay.make({
          address: sender as `${string}1${string}`,
        }),
        receiver: Ucs05.EvmDisplay.make({ address: receiverHex }),
        baseToken: baseTokenHex,
        baseAmount: amount,
        quoteToken: quoteTokenHex,
        quoteAmount: amount,
        kind: TOKEN_ORDER_KIND_INITIALIZE,
        metadata: metadataHex,
      })
    )

  // Packet hash derivation matches the ESCROW flow: gno's RawSend leaves the
  // instruction tuple un-wrapped (no outer Batch envelope), so version=2 /
  // opcode=3 with the TokenOrderV2 operand bytes goes straight into the
  // packet's instruction field.
  const packetHex = await Effect.runPromise(
    Schema.encode(PacketFromHex)(
      Ucs03.Packet.make({
        salt: rawSalt,
        path: 0n,
        instruction: Instruction.make({
          version: INSTR_VERSION_2,
          opcode: OP_TOKEN_ORDER,
          operand: `0x${operandHex}` as `0x${string}`,
        }),
      })
    )
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

  // Native-token INITIALIZE is also a token send. gno-ibc requires the
  // attached coin to match TokenOrderV2.BaseAmount exactly.
  const sendAmount = `${amount.toString()}${baseToken}`

  const messages: GnoVmCallMessage[] = [
    {
      type: '/vm.m_call',
      value: {
        caller: sender,
        send: sendAmount,
        max_deposit: '',
        pkg_path: GNO_ZKGM_REALM_PATH,
        func: RAW_SEND_FUNC,
        args: [
          sourceChannelId.toString(),
          timeoutTimestampNs.toString(),
          saltHex,
          INSTR_VERSION_2.toString(),
          OP_TOKEN_ORDER.toString(),
          operandHex,
        ],
      },
    },
  ]

  return {
    hash,
    messages,
    gasFee: GNO_DIRECT_GAS_FEE,
    gasWanted: GNO_INIT_GAS_WANTED,
  }
}
