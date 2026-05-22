import { ReactElement } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'

import { NETWORK } from 'consts'

import { BlockChainType } from 'types/network'

import useAuth from 'hooks/useAuth'

import SendStore from 'store/SendStore'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

import SelectBlockChain from 'components/SelectBlockChain'

const BlockChainNetwork = (): ReactElement => {
  const status = useRecoilValue(SendProcessStore.sendProcessStatus)
  const [toBlockChain, setToBlockChain] = useRecoilState(SendStore.toBlockChain)
  const [fromBlockChain, setFromBlockChain] = useRecoilState(
    SendStore.fromBlockChain
  )
  const { setBlockchainStorage } = useAuth()

  const fromOptions = [
    {
      label: NETWORK.blockChainName[BlockChainType.gnoland],
      value: BlockChainType.gnoland,
      isDisabled: fromBlockChain === BlockChainType.gnoland,
    },
    {
      label: NETWORK.blockChainName[BlockChainType.ethereum],
      value: BlockChainType.ethereum,
      isDisabled: fromBlockChain === BlockChainType.ethereum,
    },
    {
      label: `${NETWORK.blockChainName[BlockChainType.base]} (paused)`,
      value: BlockChainType.base,
      isDisabled: true,
    },
  ]

  const toOptions = [
    {
      label: NETWORK.blockChainName[BlockChainType.gnoland],
      value: BlockChainType.gnoland,
      isDisabled: toBlockChain === BlockChainType.gnoland,
    },
    {
      label: NETWORK.blockChainName[BlockChainType.ethereum],
      value: BlockChainType.ethereum,
      isDisabled: toBlockChain === BlockChainType.ethereum,
    },
    {
      label: `${NETWORK.blockChainName[BlockChainType.base]} (paused)`,
      value: BlockChainType.base,
      isDisabled: true,
    },
  ]

  const onSwap = (): void => {
    setFromBlockChain(toBlockChain)
    setToBlockChain(fromBlockChain)
    setBlockchainStorage({
      fromBlockChain: toBlockChain,
      toBlockChain: fromBlockChain,
    })
  }

  return (
    <div className="chain-swap">
      <SelectBlockChain
        blockChain={fromBlockChain}
        setBlockChain={(value): void => {
          setFromBlockChain(value)
          setToBlockChain(BlockChainType.gnoland)
          setBlockchainStorage({
            fromBlockChain: value,
            toBlockChain: BlockChainType.gnoland,
          })
        }}
        optionList={fromOptions}
        label="From"
      />
      {status === ProcessStatus.Input ? (
        <button
          type="button"
          className="swap-btn"
          onClick={onSwap}
          aria-label="swap chains"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M7 10h11l-3-3M17 14H6l3 3" />
          </svg>
        </button>
      ) : (
        <div style={{ width: 32 }} />
      )}
      <SelectBlockChain
        blockChain={toBlockChain}
        setBlockChain={(b): void => {
          setToBlockChain(b)
          if (fromBlockChain !== BlockChainType.gnoland) {
            setFromBlockChain(BlockChainType.gnoland)
          }
          setBlockchainStorage({
            fromBlockChain: BlockChainType.gnoland,
            toBlockChain: b,
          })
        }}
        optionList={toOptions}
        label="To"
      />
    </div>
  )
}

export default BlockChainNetwork
