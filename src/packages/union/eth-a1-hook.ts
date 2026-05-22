// @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
if (typeof BigInt.prototype.toJSON !== 'function') {
  // @ts-expect-error -- BigInt.prototype.toJSON may not exist in some environments
  BigInt.prototype.toJSON = function () {
    return this.toString()
  }
}
import {
  Batch,
  Call,
  TokenOrder,
  Ucs03,
  Ucs05,
  Utils,
  ZkgmClientRequest,
  ZkgmInstruction,
} from '@unionlabs/sdk'
import { ChainRegistry } from '@unionlabs/sdk/ChainRegistry'
import { ChannelId } from '@unionlabs/sdk/schema/channel'
import { HexFromJson } from '@unionlabs/sdk/schema/hex'
import { Instruction, PacketFromHex, Ucs03FromHex } from '@unionlabs/sdk/Ucs03'
import { EvmZkgmClient } from '@unionlabs/sdk-evm'
import * as A from 'effect/Array'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as ParseResult from 'effect/ParseResult'
import * as Schema from 'effect/Schema'
import {
  bytesToHex,
  encodeAbiParameters,
  fromHex,
  keccak256,
  parseAbiParameters,
} from 'viem'

import {
  BASE_BYTECODE_BASE_CHECKSUM,
  BASE_CHAIN_ID,
  BASE_MODULE_HASH,
  BASE_SOURCE_CHANNEL_ID,
  BASEOSMO_SOURCE_CHANNEL_ID,
  CANONICAL_BASE_ZKGM,
  CANONICAL_ETH_ZKGM,
  cosmosUcs,
  ETH_BYTECODE_BASE_CHECKSUM,
  ETH_MODULE_HASH,
  ETH_SOURCE_CHANNEL_ID,
  ETHEREUM_CHAIN_ID,
  etherUcs,
  ETHOSMO_SOURCE_CHANNEL_ID,
  OSMOSIS_CHAIN_ID,
  OSMOSIS_TO_GNOLAND_CHANNEL,
  UCS03_BASE_EVM,
  UCS03_ETH_EVM,
} from './constants'

/**
 * Generate a deterministic Union cosmos address from an EVM address using instantiate2
 * This is used to create the receiver address for cross-chain operations
 */
export const predictProxy = (src: string) =>
  Effect.fn('predictProxy')(function* (options: {
    path: bigint
    channel: ChannelId
    sender: Ucs05.AnyDisplay
  }) {
    const sender = yield* Ucs05.anyDisplayToZkgm(options.sender)
    const abi = [
      {
        name: 'path',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'channelId',
        type: 'uint32',
        internalType: 'uint32',
      },
      {
        name: 'sender',
        type: 'bytes',
        internalType: 'bytes',
      },
    ] as const

    const salt = yield* pipe(
      Effect.try(() =>
        encodeAbiParameters(abi, [
          options.path,
          options.channel,
          sender,
        ] as const)
      ),
      Effect.map((encoded) => keccak256(encoded, 'bytes'))
    )

    const u64toBeBytes = (n: bigint) => {
      const buffer = new ArrayBuffer(8)
      const view = new DataView(buffer)
      view.setBigUint64(0, n)
      return new Uint8Array(view.buffer)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sha256 = Effect.fn((data: any) =>
      Effect.tryPromise(() => globalThis.crypto.subtle.digest('SHA-256', data))
    )

    const address = yield* pipe(
      Uint8Array.from([
        ...fromHex(
          src === 'ethereum' ? ETH_MODULE_HASH : BASE_MODULE_HASH,
          'bytes'
        ),
        ...new TextEncoder().encode('wasm'),
        0,
        ...u64toBeBytes(32n),
        ...fromHex(
          src === 'ethereum'
            ? ETH_BYTECODE_BASE_CHECKSUM
            : BASE_BYTECODE_BASE_CHECKSUM,
          'bytes'
        ),
        ...u64toBeBytes(32n),
        ...fromHex(
          src === 'ethereum' ? CANONICAL_ETH_ZKGM : CANONICAL_BASE_ZKGM,
          'bytes'
        ),
        ...u64toBeBytes(32n),
        ...salt,
        ...u64toBeBytes(0n),
      ]),
      sha256,
      Effect.map((r) => new Uint8Array(r)),
      Effect.map(bytesToHex),
      Effect.flatMap(
        Schema.decode(Ucs05.Bech32FromCanonicalBytesWithPrefix('osmo'))
      )
    )

    return Ucs05.CosmosDisplay.make({ address })
  })

export const makeEthToGnolandTransaction = async (
  src: string,
  _dest: string,
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
      ParseResult.ParseError | Cause.TimeoutException
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
    const sourceChain =
      src === 'ethereum'
        ? yield* ChainRegistry.byUniversalId(ETHEREUM_CHAIN_ID)
        : yield* ChainRegistry.byUniversalId(BASE_CHAIN_ID)

    const source_channel =
      src === 'ethereum'
        ? ETHOSMO_SOURCE_CHANNEL_ID
        : BASEOSMO_SOURCE_CHANNEL_ID
    const proxy = yield* predictProxy(src)({
      path: 0n,
      channel: source_channel,
      sender: etherUcs(sender),
    })

    const timeout_timestamp = Utils.getTimeoutInNanoseconds24HoursFromNow()

    const tokenOrder = yield* TokenOrder.make({
      source: sourceChain,
      destination: osmosisChain,
      sender: etherUcs(sender),
      receiver: proxy,
      baseToken: baseToken,
      baseAmount: amount,
      quoteToken: quoteToken,
      quoteAmount: amount,
      kind: 'solve',
      metadata: solver_metadata as `0x${string}`,
      version: 2,
    })

    const ibcTransferCall = {
      ibc: {
        transfer: {
          channel_id: OSMOSIS_TO_GNOLAND_CHANNEL,
          to_address: cosmosUcs(rcpt).address,
          amount: {
            denom: quoteToken,
            amount: amount,
          },
          timeout: {
            timestamp: timeout_timestamp,
          },
          memo: '',
        },
      },
    }

    const calls = Call.make({
      sender: etherUcs(sender),
      eureka: false,
      contractAddress: proxy,
      contractCalldata: yield* Schema.decode(HexFromJson)([ibcTransferCall]),
    })

    const batch = Batch.make([tokenOrder, calls])

    const request = ZkgmClientRequest.make({
      source: sourceChain,
      destination: osmosisChain,
      channelId:
        src === 'ethereum' ? ETH_SOURCE_CHANNEL_ID : BASE_SOURCE_CHANNEL_ID,
      ucs03Address:
        src === 'ethereum' ? UCS03_ETH_EVM.address : UCS03_BASE_EVM.address,
      instruction: batch,
    })

    const client = yield* EvmZkgmClient.EvmZkgmClient
    const eip1193Request = yield* client.prepareEip1193(request)

    const packetSalt = (sender +
      eip1193Request.packetMetadata.salt.replace(/^0x/, '')) as `0x${string}`

    const packet = yield* Schema.encode(PacketFromHex)(
      Ucs03.Packet.make({
        salt: keccak256(packetSalt),
        path: 0n,
        instruction: Instruction.make({
          opcode: 2,
          version: 0,
          operand: yield* Schema.encode(Ucs03FromHex)(
            yield* encodeInstruction(batch)
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
            src === 'ethereum' ? ETH_SOURCE_CHANNEL_ID : BASE_SOURCE_CHANNEL_ID,
          destinationChannelId:
            src === 'ethereum'
              ? ETHOSMO_SOURCE_CHANNEL_ID
              : BASEOSMO_SOURCE_CHANNEL_ID,
          data: packet,
          timeoutHeight: 0n,
          timeoutTimestamp: eip1193Request.packetMetadata.timeoutTimestamp,
        },
      ],
    ])

    const hash = keccak256(raw)

    return { ...eip1193Request, hash }
  }).pipe(
    Effect.provide([ChainRegistry.Default, EvmZkgmClient.layerPure]),
    Effect.runPromise
  )
}
