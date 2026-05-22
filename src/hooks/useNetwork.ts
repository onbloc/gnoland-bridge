import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'

import NetworkStore from 'store/NetworkStore'
import SendStore from 'store/SendStore'

import {
  BlockChainType,
  isGnoChain,
  isEvmChain,
  EVM_CHAIN_IDS,
  SEPOLIA_EVM_CHAIN_ID,
} from 'types/network'

const useNetwork = (): {
  getScannerLink: (props: { address: string; type: 'tx' | 'address' }) => string
  fromTokenAddress?: string
  toTokenAddress?: string
} => {
  const asset = useRecoilValue(SendStore.asset)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const evmNetwork = useRecoilValue(NetworkStore.evmNetwork)

  const getScannerLink = ({
    address,
    type,
  }: {
    address: string
    type: 'tx' | 'address'
  }): string => {
    if (isGnoChain(fromBlockChain)) {
      // Gno.land explorer
      return type === 'tx'
        ? `https://gnoscan.io/transactions/details?txhash=${address}`
        : `https://gnoscan.io/accounts/${address}`
    } else if (fromBlockChain === BlockChainType.ethereum) {
      const host =
        evmNetwork?.chainId === SEPOLIA_EVM_CHAIN_ID
          ? 'sepolia.etherscan.io'
          : 'etherscan.io'
      return `https://${host}/${type}/${address}`
    } else if (fromBlockChain === BlockChainType.base) {
      return `https://basescan.org/${type}/${address}`
    }
    return ''
  }

  const fromTokenAddress = useMemo(() => asset?.denom, [asset])
  const toTokenAddress = useMemo(() => asset?.denom, [asset])

  return {
    getScannerLink,
    fromTokenAddress,
    toTokenAddress,
  }
}

export default useNetwork
