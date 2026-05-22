import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil'

import SendStore from 'store/SendStore'
import { BlockChainType } from 'types/network'
import { RequestTxResultType } from 'types/send'
import useBridge from 'hooks/useBridge'

export interface UseSendType {
  initSendData: () => void
  submitRequestTx: () => Promise<RequestTxResultType>
}

const useSend = (): UseSendType => {
  const [asset, setAsset] = useRecoilState(SendStore.asset)
  const [toAddress, setToAddress] = useRecoilState(SendStore.toAddress)
  const [amount, setAmount] = useRecoilState(SendStore.amount)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const setPacketHash = useSetRecoilState(SendStore.packetHash)

  const { createBridge } = useBridge()

  const initSendData = (): void => {
    setAsset(undefined)
    setToAddress('')
    setAmount('')
  }

  const submitRequestTx = async (): Promise<RequestTxResultType> => {
    if (!asset) {
      return { success: false, errorMessage: 'No asset selected' }
    }

    const result = await createBridge(
      fromBlockChain,
      toBlockChain,
      toAddress,
      asset.denom,
      amount
    )

    if (result.success && result.packetHash) {
      setPacketHash(result.packetHash)
    }

    return result
  }

  return {
    initSendData,
    submitRequestTx,
  }
}

export default useSend
