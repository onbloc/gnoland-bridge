import { useMemo } from 'react'
import { useQuery } from 'react-query'
import { useRecoilValue } from 'recoil'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import type { ActivityItem, ActivityStatus } from 'components/YourActivity'
import {
  RELAYER_CHAIN_DISPLAY,
  fetchWalletTransfers,
  getRelayerChainId,
  getRelayerChainName,
  getRelayerStatusUrl,
  getRelayerTransferAmount,
  getRelayerTransferTokenSymbol,
  getTxExplorerUrl,
  transferMatchesCurrent,
  type RelayerTransfer,
} from 'packages/relayer-api'
import AuthStore from 'store/AuthStore'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'
import SendStore from 'store/SendStore'
import { isGnoChain } from 'types/network'

dayjs.extend(relativeTime)

const statusToActivityStatus = (status: number): ActivityStatus => {
  if (status === 2) return 'success'
  if (status === 3) return 'failed'
  return 'processing'
}

const toActivityItem = (
  transfer: RelayerTransfer,
  current = false
): ActivityItem => ({
  id: transfer.packet_hash,
  sourceLabel: getRelayerChainName(transfer.src_chain_id),
  sourceColor: RELAYER_CHAIN_DISPLAY[transfer.src_chain_id]?.color ?? '#9F9F9F',
  destinationLabel: getRelayerChainName(transfer.dst_chain_id),
  destinationColor:
    RELAYER_CHAIN_DISPLAY[transfer.dst_chain_id]?.color ?? '#9F9F9F',
  amountLabel: getRelayerTransferAmount(transfer),
  tokenSymbol: getRelayerTransferTokenSymbol(transfer),
  status: statusToActivityStatus(transfer.status),
  stage: transfer.status,
  timeLabel: current
    ? 'Current transfer'
    : dayjs(transfer.created_at).fromNow(),
  fromAddress: transfer.from_address,
  toAddress: transfer.to_address,
  txOutHash: transfer.tx_out,
  txInHash: transfer.tx_in,
  txHref: transfer.tx_out ? getTxExplorerUrl(transfer.tx_out) : undefined,
  txInHref: transfer.tx_in ? getTxExplorerUrl(transfer.tx_in) : undefined,
  href: getRelayerStatusUrl(transfer.packet_hash),
})

export interface UseWalletActivityReturn {
  items: ActivityItem[]
  loading: boolean
  error: Error | null
  senderAddress?: string
}

export const useWalletActivity = (): UseWalletActivityReturn => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const toAddress = useRecoilValue(SendStore.toAddress)
  const amount = useRecoilValue(SendStore.amount)
  const packetHash = useRecoilValue(SendStore.packetHash)
  const sendProcessStatus = useRecoilValue(SendProcessStore.sendProcessStatus)
  const requestTxResult = useRecoilValue(SendProcessStore.requestTxResult)

  const senderAddress = isGnoChain(fromBlockChain)
    ? gnoWallet?.address
    : evmWallet?.address

  const sourceChainId = getRelayerChainId(fromBlockChain)
  const destinationChainId = getRelayerChainId(toBlockChain)
  const txHash = requestTxResult.success ? requestTxResult.hash : undefined
  const canMatchCurrentTransfer = sendProcessStatus !== ProcessStatus.Input

  const walletQuery = useQuery(
    ['wallet-activity', senderAddress],
    () => fetchWalletTransfers(senderAddress || '', { limit: 20 }),
    {
      enabled: !!senderAddress,
      staleTime: 5_000,
      refetchInterval: 5_000,
      // PacketTracker polls via plain setInterval, which keeps running in a
      // backgrounded tab; react-query's refetchInterval pauses there by
      // default, so this list can visibly lag behind the Transfer complete
      // page's status when the two are open in separate tabs.
      refetchIntervalInBackground: true,
    }
  )

  const items = useMemo<ActivityItem[]>(() => {
    const transfers = walletQuery.data?.data ?? []
    const matched = canMatchCurrentTransfer
      ? transfers.find((transfer) =>
          transferMatchesCurrent({
            transfer,
            packetHash,
            txHash,
            senderAddress,
            receiverAddress: toAddress,
            amount,
            sourceChainId,
            destinationChainId,
          })
        )
      : undefined

    if (!matched) return transfers.map((transfer) => toActivityItem(transfer))

    return [
      toActivityItem(matched, true),
      ...transfers
        .filter((transfer) => transfer.packet_hash !== matched.packet_hash)
        .map((transfer) => toActivityItem(transfer)),
    ]
  }, [
    amount,
    canMatchCurrentTransfer,
    destinationChainId,
    packetHash,
    senderAddress,
    sourceChainId,
    toAddress,
    txHash,
    walletQuery.data,
  ])

  return {
    items,
    loading: walletQuery.isLoading,
    error: walletQuery.error as Error | null,
    senderAddress,
  }
}

export default useWalletActivity
