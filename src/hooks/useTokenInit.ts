import { useState, useCallback } from 'react'
import { useRecoilValue } from 'recoil'

import { makeGnoDirectToEthInitializeTransaction } from 'packages/union/gno-eth-init-zkgm'
import {
  fetchPacketHashFromTx,
  queryChannelState,
} from 'packages/union/gno-zkgm-abci'
import { GNO_DIRECT_ZKGM_ENABLED } from 'packages/union/gno-zkgm-constants'
import { GnoDirectTxResult } from 'packages/union/gno-zkgm-types'
import AuthStore from 'store/AuthStore'
import { RequestTxResultType } from 'types/send'

export type InitTokenParams = {
  baseToken: string
  amount: bigint
  quoteToken: string
  metadataHex: `0x${string}`
  operandHexOverride?: string
  sourceChannelId: number
  destinationChannelId: number
  // Defaults to 'ethereum'. Reserved for future Base support.
  dest?: 'ethereum' | 'base'
  // Optional EVM recipient for the initial quote amount.
  receiver?: string
}

export interface UseTokenInitReturn {
  loading: boolean
  initToken: (params: InitTokenParams) => Promise<RequestTxResultType>
}

const useTokenInit = (): UseTokenInitReturn => {
  const [loading, setLoading] = useState(false)
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)

  const initToken = useCallback(
    async (params: InitTokenParams): Promise<RequestTxResultType> => {
      setLoading(true)
      try {
        if (!GNO_DIRECT_ZKGM_ENABLED) {
          return {
            success: false,
            errorMessage:
              'Gno-direct ZKGM flow is disabled. Set VITE_GNO_DIRECT_ZKGM=true and retry.',
          }
        }
        if (typeof window === 'undefined' || !window.adena) {
          return {
            success: false,
            errorMessage: 'Adena wallet is not installed',
          }
        }
        const address = gnoWallet?.address
        if (!address) {
          return {
            success: false,
            errorMessage: 'Adena wallet not connected',
          }
        }

        const directTx: GnoDirectTxResult =
          await makeGnoDirectToEthInitializeTransaction({
            src: 'gnoland',
            dest: params.dest ?? 'ethereum',
            sender: address,
            receiver: params.receiver,
            baseToken: params.baseToken,
            amount: params.amount,
            quoteToken: params.quoteToken,
            metadataHex: params.metadataHex,
            operandHexOverride: params.operandHexOverride,
            sourceChannelId: params.sourceChannelId,
            destinationChannelId: params.destinationChannelId,
          })

        const response = await window.adena.DoContract({
          messages: directTx.messages,
          gasFee: directTx.gasFee,
          gasWanted: directTx.gasWanted,
        })

        if (response?.status !== 'success') {
          return {
            success: false,
            errorMessage: response?.message || 'Adena transaction rejected',
          }
        }

        // Best-effort channel-state probe via ABCI. Confirms the gno-ibc core
        // realm sees the channel after the Send committed; failures are
        // non-fatal so the result still surfaces to the user.
        void queryChannelState(params.sourceChannelId).catch((err: unknown) => {
          console.warn('[token-init] ABCI channel probe failed', err)
        })

        // Prefer the chain-emitted packet_hash over the off-chain estimate.
        // Falls back to the client estimate if the tx index hasn't caught up.
        const txHash = response?.data?.hash
        let packetHash: string = directTx.hash
        if (txHash) {
          try {
            const chainHash = await fetchPacketHashFromTx(txHash)
            if (chainHash) packetHash = chainHash
          } catch (err) {
            console.warn(
              '[token-init] chain packet_hash fetch failed; using off-chain estimate',
              err
            )
          }
        }

        return {
          success: true,
          hash: txHash ?? '',
          packetHash,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, errorMessage: message }
      } finally {
        setLoading(false)
      }
    },
    [gnoWallet]
  )

  return { loading, initToken }
}

export default useTokenInit
