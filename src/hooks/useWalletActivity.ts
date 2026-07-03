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
  return 'pending'
}

const isSameAddress = (a?: string, b?: string): boolean =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase()

const transferMatchesCurrent = ({
  transfer,
  packetHash,
  txHash,
  senderAddress,
  receiverAddress,
  amount,
  sourceChainId,
  destinationChainId,
}: {
  transfer: RelayerTransfer
  packetHash: string
  txHash?: string
  senderAddress?: string
  receiverAddress: string
  amount: string
  sourceChainId?: string
  destinationChainId?: string
}): boolean => {
  if (packetHash && transfer.packet_hash === packetHash) return true
  if (txHash && transfer.tx_out === txHash) return true
  if (!senderAddress || !receiverAddress || !amount) return false
  return (
    isSameAddress(transfer.from_address, senderAddress) &&
    isSameAddress(transfer.to_address, receiverAddress) &&
    transfer.base_amount === amount &&
    (!sourceChainId || transfer.src_chain_id === sourceChainId) &&
    (!destinationChainId || transfer.dst_chain_id === destinationChainId)
  )
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
  txHref: transfer.tx_out
    ? getRelayerStatusUrl(transfer.packet_hash)
    : undefined,
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
