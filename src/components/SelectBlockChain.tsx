import { ReactElement, useState } from 'react'
import ClickAwayListener from 'react-click-away-listener'
import { useRecoilValue } from 'recoil'

import { NETWORK } from 'consts'

import { BlockChainType } from 'types/network'

import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

interface Option {
  value: BlockChainType
  label: string
  isDisabled?: boolean
}

interface Props {
  blockChain: BlockChainType
  setBlockChain: (value: BlockChainType) => void
  optionList: Option[]
  label: string
}

const ChainIcon = ({
  chain,
  size = 32,
}: {
  chain: BlockChainType
  size?: number
}): ReactElement => (
  <div
    className="chain-pill__logo"
    style={{
      width: size,
      height: size,
      background: 'var(--bg-surface-1)',
      overflow: 'hidden',
    }}
  >
    <img
      src={NETWORK.blockChainImage[chain]}
      alt=""
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  </div>
)

const SelectBlockChain = ({
  blockChain,
  setBlockChain,
  optionList,
  label,
}: Props): ReactElement => {
  const status = useRecoilValue(SendProcessStore.sendProcessStatus)
  const [open, setOpen] = useState(false)

  const editable = status === ProcessStatus.Input
  const currentName = NETWORK.blockChainName[blockChain]

  if (!editable) {
    return (
      <div className="chain-pill" style={{ cursor: 'default' }}>
        <ChainIcon chain={blockChain} />
        <div className="chain-pill__col">
          <span className="chain-pill__label">{label}</span>
          <span className="chain-pill__name">{currentName}</span>
        </div>
      </div>
    )
  }

  return (
    <ClickAwayListener onClickAway={(): void => setOpen(false)}>
      <div style={{ position: 'relative', flex: 1 }}>
        <button
          type="button"
          className="chain-pill"
          onClick={(): void => setOpen((o) => !o)}
        >
          <ChainIcon chain={blockChain} />
          <div className="chain-pill__col">
            <span className="chain-pill__label">{label}</span>
            <span className="chain-pill__name">{currentName}</span>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              padding: 4,
              background: 'var(--bg-base)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--r-1)',
              zIndex: 30,
              boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
            }}
          >
            {optionList.map((opt) => {
              const selected = opt.value === blockChain
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="asset-row"
                  style={{
                    marginBottom: 2,
                    border: 0,
                    background: selected
                      ? 'var(--bg-surface-1)'
                      : 'transparent',
                    opacity: opt.isDisabled ? 0.5 : 1,
                    cursor: opt.isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  disabled={opt.isDisabled}
                  onClick={(): void => {
                    if (opt.isDisabled) return
                    setBlockChain(opt.value)
                    setOpen(false)
                  }}
                >
                  <ChainIcon chain={opt.value} size={28} />
                  <div className="asset-row__main">
                    <div className="asset-row__name">{opt.label}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </ClickAwayListener>
  )
}

export default SelectBlockChain
