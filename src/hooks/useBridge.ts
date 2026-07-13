import { useState, useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import { erc20Abi, maxUint256 } from 'viem'

import { getEvmPublicClient } from 'config/wagmi'
import { makeGnolandToEthTransaction } from 'packages/union/a1-eth-hook'
import { makeEthToGnolandTransaction } from 'packages/union/eth-a1-hook'
import { ETH_ZKGM_ADDRESS } from 'packages/union/constants'
import { pickEvmChain, sepoliaChain } from 'packages/union/evm-chains'
import { makeEthToGnoDirectTransaction } from 'packages/union/eth-gno-zkgm'
import { makeGnoDirectToEthTransaction } from 'packages/union/gno-eth-zkgm'
import {
  fetchPacketHashFromTx,
  queryChannelState,
} from 'packages/union/gno-zkgm-abci'
import { GNO_DIRECT_ZKGM_ENABLED } from 'packages/union/gno-zkgm-constants'
import { GnoDirectTxResult } from 'packages/union/gno-zkgm-types'
import routes from 'consts/routes'
import AuthStore from 'store/AuthStore'
import NetworkStore from 'store/NetworkStore'
import SendStore from 'store/SendStore'
import { RequestTxResultType } from 'types/send'
import { NETWORK } from 'consts'

interface BridgeInfo {
  memo: unknown
  hash: string
  baseToken: string
  receiver: string
  sourceChannel: string
}

const buildBridgeInfo = async (
  src: string,
  dest: string,
  rcpt: string,
  sender: string,
  denom: string,
  amount: string
): Promise<BridgeInfo> => {
  const route = routes.find(
    (r) =>
      r.src.toLowerCase() === src.toLowerCase() &&
      r.dest.toLowerCase() === dest.toLowerCase() &&
      denom === r.denom
  )
  if (!route) {
    throw new Error(
      `Bridge from ${src} to ${dest} with denom ${denom} is not supported.`
    )
  }

  if (src === 'gnoland') {
    const { hash, ...memo } = await makeGnolandToEthTransaction(
      src,
      dest,
      sender,
      rcpt,
      BigInt(amount),
      route.baseToken,
      route.quoteToken,
      route.metadata
    )
    return {
      memo,
      hash,
      baseToken: route.baseToken,
      receiver: ETH_ZKGM_ADDRESS,
      sourceChannel: `channel-${route.source_channel}`,
    }
  } else {
    const { hash, ...tx } = await makeEthToGnolandTransaction(
      src,
      dest,
      sender,
      rcpt,
      BigInt(amount),
      route.baseToken,
      route.quoteToken,
      route.metadata
    )
    return {
      hash,
      memo: tx.preparedRequest,
      baseToken: route.baseToken,
      receiver: tx.preparedRequest.to as string,
      sourceChannel: `channel-${route.source_channel}`,
    }
  }
}

export interface UseBridgeReturn {
  loading: boolean
  createBridge: (
    src: string,
    dest: string,
    rcpt: string,
    denom: string,
    amount: string
  ) => Promise<RequestTxResultType>
}

export default function useBridge(): UseBridgeReturn {
  const [loading, setLoading] = useState(false)
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const evmNetwork = useRecoilValue(NetworkStore.evmNetwork)

  const createBridge = useCallback(
    async (
      src: string,
      dest: string,
      rcpt: string,
      denom: string,
      amount: string
    ): Promise<RequestTxResultType> => {
      setLoading(true)
      try {
        if (src === 'gnoland') {
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

          const route = routes.find(
            (r) =>
              r.src.toLowerCase() === src.toLowerCase() &&
              r.dest.toLowerCase() === dest.toLowerCase() &&
              denom === r.denom
          )
          const useDirect =
            GNO_DIRECT_ZKGM_ENABLED && !!route && route.via === 'gno-direct'

          if (!useDirect || !route) {
            return {
              success: false,
              errorMessage: `Gno-direct ZKGM route not configured for ${src} -> ${dest} (${denom}). Add the route to src/consts/routes.ts and set VITE_GNO_DIRECT_ZKGM=true.`,
            }
          }

          const sourceChannelId = Number.parseInt(route.source_channel, 10)
          const destinationChannelId = Number.parseInt(route.dest_channel, 10)

          const directTx: GnoDirectTxResult =
            await makeGnoDirectToEthTransaction({
              src: 'gnoland',
              dest: dest as 'ethereum',
              sender: address,
              rcpt,
              amount: BigInt(amount),
              baseToken: route.baseToken,
              quoteToken: route.quoteToken,
              solverMetadata: route.metadata,
              kind: route.kind,
              baseDecimals: route.baseDecimals,
              quoteDecimals: route.quoteDecimals,
              sourceChannelId,
              destinationChannelId,
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

          // Best-effort channel-state probe via ABCI. Confirms the gno-ibc
          // core realm sees the channel after our Send committed; failures
          // are non-fatal so the tx result still surfaces to the user.
          void queryChannelState(sourceChannelId).catch((err: unknown) => {
            console.warn('[gno-direct] ABCI channel probe failed', err)
          })

          // Prefer the chain-emitted packet_hash over our off-chain estimate.
          // CommitPacket on the gno side is the source of truth, and reading
          // it directly removes any drift risk between the client encoder
          // and the chain's ABI layout. Falls back to the client estimate
          // if the tx index hasn't caught up after the retry window.
          const txHash = response?.data?.hash
          let packetHash: string = directTx.hash
          if (txHash) {
            try {
              const chainHash = await fetchPacketHashFromTx(txHash)
              if (chainHash) packetHash = chainHash
            } catch (err) {
              console.warn(
                '[gno-direct] chain packet_hash fetch failed; using off-chain estimate',
                err
              )
            }
          }

          return {
            success: true,
            hash: txHash ?? '',
            packetHash,
          }
        }

        if (src === 'ethereum') {
          const walletClient = evmWallet?.walletClient
          const address = evmWallet?.address
          if (!walletClient || !address) {
            return { success: false, errorMessage: 'EVM wallet not connected' }
          }

          // gno-direct EVM -> Gno path (ESCROW or UNESCROW per route.kind -
          // see routes.ts). Every route's EVM-side token only lives on
          // Sepolia today, so we prompt a chain switch before building the
          // tx instead of letting the SDK throw mid-broadcast.
          const route = routes.find(
            (r) =>
              r.src.toLowerCase() === src.toLowerCase() &&
              r.dest.toLowerCase() === dest.toLowerCase() &&
              denom === r.denom
          )
          const useDirect =
            GNO_DIRECT_ZKGM_ENABLED &&
            !!route &&
            route.via === 'gno-direct' &&
            dest === 'gnoland' &&
            src === 'ethereum'

          if (useDirect && route) {
            if (evmNetwork?.chainId !== sepoliaChain.id) {
              try {
                await walletClient.switchChain({ id: sepoliaChain.id })
              } catch (err) {
                const m = err instanceof Error ? err.message : 'switch failed'
                return {
                  success: false,
                  errorMessage: `Switch your wallet to Sepolia (chainId 0xaa36a7) and retry. ${m}`,
                }
              }
            }

            const directTx = await makeEthToGnoDirectTransaction({
              src: 'ethereum',
              dest: 'gnoland',
              sender: address as `0x${string}`,
              rcpt,
              amount: BigInt(amount),
              baseToken: route.baseToken,
              quoteToken: route.quoteToken,
              solverMetadata: route.metadata,
              kind: route.kind,
              sourceChannelId: Number.parseInt(route.source_channel, 10),
              destinationChannelId: Number.parseInt(route.dest_channel, 10),
            })

            const publicClient = getEvmPublicClient(sepoliaChain.id)
            const spender = directTx.preparedRequest.to
            const allowance = await publicClient.readContract({
              address: route.baseToken as `0x${string}`,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [address as `0x${string}`, spender],
            })
            if (allowance < BigInt(amount)) {
              const approveTxHash = await walletClient.writeContract({
                address: route.baseToken as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [spender, maxUint256],
                account: address as `0x${string}`,
                chain: sepoliaChain,
              })
              await publicClient.waitForTransactionReceipt({
                hash: approveTxHash,
              })
            }

            const txHash = await walletClient.sendTransaction({
              to: directTx.preparedRequest.to,
              data: directTx.preparedRequest.data,
              value: directTx.preparedRequest.value,
              account: address as `0x${string}`,
              chain: sepoliaChain,
            })

            // packetHash here is our off-chain estimate; it can drift from
            // what ZKGM actually commits on-chain. PacketTracker re-resolves
            // it against the relayer's indexed tx_out once polling starts.
            return {
              success: true,
              hash: txHash,
              packetHash: directTx.hash,
            }
          }

          const { memo, baseToken, hash } = await buildBridgeInfo(
            src,
            dest,
            rcpt,
            address,
            denom,
            amount
          )

          // ERC20 approval: spender is the UCS03 ZKGM contract on the EVM chain
          if (baseToken.startsWith('0x')) {
            const spender = (memo as Record<string, unknown>)
              .to as `0x${string}`
            const chain = pickEvmChain(evmNetwork?.chainId)
            const publicClient = getEvmPublicClient(chain.id)

            const allowance = await publicClient.readContract({
              address: baseToken as `0x${string}`,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [address as `0x${string}`, spender],
            })

            if (allowance < BigInt(amount)) {
              const approveTxHash = await walletClient.writeContract({
                address: baseToken as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [spender, maxUint256],
                account: address as `0x${string}`,
                chain,
              })

              // Wait for approval to be mined
              await publicClient.waitForTransactionReceipt({
                hash: approveTxHash,
              })
            }
          }

          // memo is the full preparedRequest from Union SDK
          const preparedRequest = memo as Record<string, unknown>

          const txHash = await walletClient.sendTransaction({
            to: preparedRequest.to as `0x${string}`,
            data: preparedRequest.data as `0x${string}`,
            value: preparedRequest.value
              ? BigInt(preparedRequest.value as string)
              : BigInt(0),
            account: address as `0x${string}`,
            chain: undefined,
          })

          return {
            success: true,
            hash: txHash,
            packetHash: hash,
          }
        }

        return {
          success: false,
          errorMessage: `Unsupported source chain: ${src}`,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, errorMessage: message }
      } finally {
        setLoading(false)
      }
    },
    [gnoWallet, evmWallet, evmNetwork, fromBlockChain]
  )

  return { loading, createBridge }
}
