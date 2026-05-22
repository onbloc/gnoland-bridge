import { Ucs03, Ucs05 } from '@unionlabs/sdk'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

// TokenOrderV2 Kind constants mirror gno-zkgm-constants.ts and the Union SDK
// internal kindToConst mapping (initialize=0, escrow=1, unescrow=2, solve=3).
export type TokenOrderV2Kind = 0 | 1 | 2 | 3

export type EncodeTokenOrderV2Input = {
  sender: Ucs05.AnyDisplay
  receiver: Ucs05.AnyDisplay
  baseToken: `0x${string}`
  baseAmount: bigint
  quoteToken: `0x${string}`
  quoteAmount: bigint
  kind: TokenOrderV2Kind
  metadata: `0x${string}` | '0x'
}

// Encode a TokenOrderV2 instruction payload to its on-wire hex form. Mirrors
// `TokenOrder.encodeV2` internals (S.decode(Ucs03.TokenOrderV2) over the operand
// tuple) but skips `TokenOrder.make` so Gno-side flows do not need a Chain
// registry entry for source/destination.
export const encodeTokenOrderV2Hex = async (
  input: EncodeTokenOrderV2Input
): Promise<`0x${string}`> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const senderHex = yield* Ucs05.anyDisplayToZkgm(input.sender)
      const receiverHex = yield* Ucs05.anyDisplayToZkgm(input.receiver)

      const tokenOrder = yield* Schema.decode(Ucs03.TokenOrderV2)({
        _tag: '@unionlabs/sdk/Ucs03/TokenOrder',
        opcode: 3,
        version: 2,
        operand: [
          senderHex,
          receiverHex,
          input.baseToken,
          input.baseAmount,
          input.quoteToken,
          input.quoteAmount,
          input.kind,
          input.metadata,
        ],
      })

      return yield* Schema.encode(Ucs03.TokenOrderFromHex)(tokenOrder)
    })
  )
