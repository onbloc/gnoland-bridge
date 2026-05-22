// @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
if (typeof BigInt.prototype.toJSON !== 'function') {
  // @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
  BigInt.prototype.toJSON = function () {
    return this.toString()
  }
}
import {
  Call,
  TokenOrder,
  Ucs03,
  Ucs05,
  Utils,
  ZkgmInstruction,
} from '@unionlabs/sdk'
import { ChainRegistry } from '@unionlabs/sdk/ChainRegistry'
import { Instruction, PacketFromHex, Ucs03FromHex } from '@unionlabs/sdk/Ucs03'
import { Cosmos } from '@unionlabs/sdk-cosmos'
import * as A from 'effect/Array'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as ParseResult from 'effect/ParseResult'
import * as Schema from 'effect/Schema'
import { encodeAbiParameters, keccak256, parseAbiParameters } from 'viem'

import {
  BASE_CHAIN_ID,
  BASE_SOURCE_CHANNEL_ID,
  BASE_ZKGM_ADDRESS,
  BASEOSMO_SOURCE_CHANNEL_ID,
  cosmosUcs,
  ETH_SOURCE_CHANNEL_ID,
  ETH_ZKGM_ADDRESS,
  ETHEREUM_CHAIN_ID,
  etherUcs,
  ETHOSMO_SOURCE_CHANNEL_ID,
  OSMOSIS_CHAIN_ID,
  OSMOSIS_TO_GNOLAND_CHANNEL,
} from './constants'

function convertToHex(str: string) {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16)
  }
  return hex
}
export const makeGnolandToEthTransaction = async (
  src: string,
  dest: string,
  sender: string,
  rcpt: string,
  amount: bigint,
  baseToken: string,
  quoteToken: string,
  solver_metadata: string
) => {
  return Effect.gen(function* () {
    const encodeInstruction: (
      u: ZkgmInstruction.ZkgmInstruction
    ) => Effect.Effect<
      Ucs03.Ucs03,
      | ParseResult.ParseError
      | Cause.TimeoutException
      | Cosmos.QueryContractError
    > = pipe(
      Match.type<ZkgmInstruction.ZkgmInstruction>(),
      Match.tagsExhaustive({
        Batch: (batch) =>
          pipe(
            batch.instructions,
            A.map(encodeInstruction),
            Effect.allWith({ concurrency: 'unbounded' }),
            Effect.map(
              (operand) =>
                new Ucs03.Batch({
                  opcode: batch.opcode,
                  version: batch.version,
                  operand,
                })
            )
          ),
        TokenOrder: TokenOrder.encodeV2,
        Call: Call.encode,
      })
    )

    const osmosisChain = yield* ChainRegistry.byUniversalId(OSMOSIS_CHAIN_ID)
    const targetChain =
      src === 'ethereum'
        ? yield* ChainRegistry.byUniversalId(ETHEREUM_CHAIN_ID)
        : yield* ChainRegistry.byUniversalId(BASE_CHAIN_ID)

    const refundReceiverOsmosis = Ucs05.CosmosDisplay.make({
      address: Schema.decodeUnknownSync(
        Ucs05.Bech32FromCanonicalBytesWithPrefix('osmo')
      )(Ucs05.anyDisplayToCanonical(cosmosUcs(sender))),
    })

    const tokenOrder = yield* TokenOrder.make({
      source: targetChain,
      destination: osmosisChain,
      sender: refundReceiverOsmosis,
      receiver: etherUcs(rcpt),
      baseToken: baseToken,
      baseAmount: amount,
      quoteToken: quoteToken,
      quoteAmount: amount,
      kind: 'solve',
      metadata: solver_metadata as `0x${string}`,
      version: 2,
    })

    const salt = yield* Utils.generateSalt('cosmos')
    const timeout_timestamp = Utils.getTimeoutInNanoseconds24HoursFromNow()
    const instruction = yield* encodeInstruction(tokenOrder).pipe(
      Effect.flatMap(Schema.encode(Ucs03.Ucs03WithInstructionFromHex))
    )

    const infosender = yield* calculateIbcCallbackAddress(
      sender,
      OSMOSIS_TO_GNOLAND_CHANNEL
    )
    const saltHash = encodeAbiParameters(
      parseAbiParameters('(bytes sender, bytes32 salt)'),
      [
        {
          sender: ('0x' + convertToHex(infosender.address)) as `0x${string}`,
          salt,
        },
      ]
    )
    const packet = yield* Schema.encode(PacketFromHex)(
      Ucs03.Packet.make({
        salt: keccak256(saltHash),
        path: 0n,
        instruction: Instruction.make({
          opcode: 3,
          version: 2,
          operand: yield* Schema.encode(Ucs03FromHex)(
            yield* TokenOrder.encodeV2(tokenOrder)
          ),
        }),
      })
    )

    const packetAbi = parseAbiParameters(
      '(uint32 sourceChannelId, uint32 destinationChannelId, bytes data, uint64 timeoutHeight, uint64 timeoutTimestamp)[]'
    )

    const raw = encodeAbiParameters(packetAbi, [
      [
        {
          sourceChannelId:
            dest === 'ethereum'
              ? ETHOSMO_SOURCE_CHANNEL_ID
              : BASEOSMO_SOURCE_CHANNEL_ID,
          destinationChannelId:
            dest === 'ethereum'
              ? ETH_SOURCE_CHANNEL_ID
              : BASE_SOURCE_CHANNEL_ID,
          data: packet,
          timeoutHeight: 0n,
          timeoutTimestamp: timeout_timestamp,
        },
      ],
    ])

    const hash = keccak256(raw)

    return {
      hash,
      wasm: {
        contract: dest === 'ethereum' ? ETH_ZKGM_ADDRESS : BASE_ZKGM_ADDRESS,
        msg: {
          send: {
            channel_id:
              dest === 'ethereum'
                ? ETHOSMO_SOURCE_CHANNEL_ID
                : BASEOSMO_SOURCE_CHANNEL_ID,
            timeout_height: '0',
            timeout_timestamp,
            salt,
            instruction,
          },
        },
      },
    }
  }).pipe(Effect.provide(ChainRegistry.Default), Effect.runPromise)
}
const sha256 = (data: BufferSource) =>
  Effect.tryPromise(() => globalThis.crypto.subtle.digest('SHA-256', data))
const calculateIbcCallbackAddress = Effect.fn('calculateIbcCallbackAddress')(
  function* (sender: string, channelId: string) {
    const preimage = new Uint8Array([
      ...new Uint8Array(
        yield* sha256(
          new globalThis.TextEncoder().encode('ibc-wasm-hook-intermediary')
        )
      ),
      ...new globalThis.TextEncoder().encode(`${channelId}/${sender}`),
    ])

    const addr = Ucs05.CosmosDisplay.make({
      address: yield* Schema.decode(
        Ucs05.Bech32FromCanonicalBytesWithPrefix('osmo')
      )(
        `0x${yield* Schema.encode(Schema.Uint8ArrayFromHex)(
          new Uint8Array(yield* sha256(preimage))
        )}`
      ),
    })

    return addr
  }
)
