import { Ucs03, Ucs05 } from '@unionlabs/sdk'
import { Instruction, PacketFromHex } from '@unionlabs/sdk/Ucs03'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { encodeAbiParameters, keccak256, parseAbiParameters } from 'viem'

import { isGrc20BaseToken, stripHexPrefix, utf8ToHex } from './gno-abi'
import { encodeTokenOrderV2Hex } from './gno-token-order'
import {
  GNO_CALL_GAS_WANTED,
  GNO_DIRECT_GAS_FEE,
  GNO_ZKGM_REALM_PATH,
  INSTR_VERSION_2,
  OP_TOKEN_ORDER,
  RAW_SEND_FUNC,
  TOKEN_ORDER_KIND_ESCROW,
} from './gno-zkgm-constants'
import { GnoDirectTxResult, GnoVmCallMessage } from './gno-zkgm-types'

const TIMEOUT_HOURS = 24n
const NANOS_PER_HOUR = 3_600n * 1_000_000_000n

const bytesToHexNoPrefix = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const toBaseTokenHex = (baseToken: string): `0x${string}` =>
  baseToken.startsWith('0x')
    ? (baseToken as `0x${string}`)
    : utf8ToHex(baseToken)

const toQuoteTokenHex = (quoteToken: string): `0x${string}` =>
  quoteToken.startsWith('0x')
    ? (quoteToken as `0x${string}`)
    : utf8ToHex(quoteToken)

export type GnoToEthDirectInput = {
  src: 'gnoland'
  dest: 'ethereum' | 'base'
  sender: string
  rcpt: string
  amount: bigint
  baseToken: string
  quoteToken: string
  solverMetadata: string
  // Both channel ids come from the route entry so the wire-level SendRaw args,
  // the off-chain packet hash, and the route table cannot drift apart.
  sourceChannelId: number
  destinationChannelId: number
}

// TokenOrderV2 (Kind=ESCROW) ZKGM send via /vm.m_call -> RawSend wrapper.
// /vm.m_run can't be used here: Send's IsUserCall gate drops attached coins
// when the previous realm is the temporary `main` package, so the realm's
// coins-mismatch check always fails. Calling RawSend directly preserves the
// EOA as the previous realm, letting OriginSend report the deposit.
export const makeGnoDirectToEthTransaction = async (
  input: GnoToEthDirectInput
): Promise<GnoDirectTxResult> => {
  const {
    sender,
    rcpt,
    amount,
    baseToken,
    quoteToken,
    solverMetadata,
    sourceChannelId,
    destinationChannelId,
  } = input

  if (!Number.isInteger(sourceChannelId) || sourceChannelId < 1) {
    throw new Error(
      `Invalid sourceChannelId for Gno->EVM direct flow: ${sourceChannelId}`
    )
  }
  if (!Number.isInteger(destinationChannelId) || destinationChannelId < 1) {
    throw new Error(
      `Invalid destinationChannelId for Gno->EVM direct flow: ${destinationChannelId}`
    )
  }

  const saltBytes = new Uint8Array(32)
  crypto.getRandomValues(saltBytes)
  const saltHex = bytesToHexNoPrefix(saltBytes)
  const rawSalt: `0x${string}` = `0x${saltHex}`

  const nowNs = BigInt(Date.now()) * 1_000_000n
  const timeoutTimestampNs = nowNs + TIMEOUT_HOURS * NANOS_PER_HOUR

  const metadataHex: `0x${string}` | '0x' = solverMetadata
    ? solverMetadata.startsWith('0x')
      ? (solverMetadata as `0x${string}`)
      : utf8ToHex(solverMetadata)
    : '0x'

  const baseTokenHex = toBaseTokenHex(baseToken)
  const quoteTokenHex = toQuoteTokenHex(quoteToken)

  const operandHex = stripHexPrefix(
    await encodeTokenOrderV2Hex({
      sender: Ucs05.CosmosDisplay.make({
        address: sender as `${string}1${string}`,
      }),
      receiver: Ucs05.EvmDisplay.make({ address: rcpt as `0x${string}` }),
      baseToken: baseTokenHex,
      baseAmount: amount,
      quoteToken: quoteTokenHex,
      quoteAmount: amount,
      kind: TOKEN_ORDER_KIND_ESCROW,
      metadata: metadataHex,
    })
  )

  // Cross-chain packet hash. Mirrors gno-ibc `CommitPacket(Packet)` =
  // `keccak256(abi.encode([Packet{sourceChannelId, destinationChannelId, data,
  // timeoutHeight=0, timeoutTimestamp}]))` where `data` is the encoded
  // ZkgmPacket. Unlike the EVM ZKGM contract (which internally rewraps every
  // submission in a Batch envelope), gno's impl.Send keeps the user-submitted
  // Instruction as-is, so the outer instruction tuple is (version=2, opcode=3,
  // operand=TokenOrderV2 operand bytes) directly. Salt also flows through
  // unchanged (no keccak(sender||salt) on the gno side).
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

  // ESCROW Kind requires the deposit to flow into the ZKGM realm. For native
  // coins, the /vm.m_call `send` field carries the raw denom amount (e.g.
  // "1000000ugnot") and the realm's requireSentCoin compares against the
  // operand baseAmount. GRC20 base tokens are pulled by the realm via
  // TransferFrom instead, so `send` must stay empty — the sender needs to
  // have Approve()'d the realm address beforehand.
  const sendAmount = isGrc20BaseToken(baseToken)
    ? ''
    : `${amount.toString()}${baseToken}`

  // SendRaw signature (gno.land/r/onbloc/ibc/union/apps/ucs03_zkgm):
  //   func SendRaw(cur realm, channelId uint32, timeoutTimestamp uint64,
  //                saltHex string, version uint8, opcode uint8, operandHex string)
  // saltHex and operandHex are passed without the `0x` prefix.
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
    gasWanted: GNO_CALL_GAS_WANTED,
  }
}
