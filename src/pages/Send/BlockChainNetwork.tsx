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

  // Any two distinct chains can pair now (not just gnoland<->X), so each
  // side just needs to disable whichever value the OTHER side already holds
  // (a chain can't send to itself). The swap button handles flipping pairs.
  // AtomOne is left out entirely - no wired send path yet (see
  // consts/routes.ts).
  const allChains = [BlockChainType.gnoland, BlockChainType.ethereum]

  const fromOptions = allChains.map((value) => ({
    label: NETWORK.blockChainName[value],
    value,
    isDisabled: value === fromBlockChain || value === toBlockChain,
  }))

  const toOptions = allChains.map((value) => ({
    label: NETWORK.blockChainName[value],
    value,
    isDisabled: value === toBlockChain || value === fromBlockChain,
  }))

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
          setBlockchainStorage({
            fromBlockChain: value,
            toBlockChain,
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
          setBlockchainStorage({
            fromBlockChain,
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
