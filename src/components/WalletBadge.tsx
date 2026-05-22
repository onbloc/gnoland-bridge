import { ReactElement, useState } from 'react'
import ClickAwayListener from 'react-click-away-listener'

import { UTIL } from 'consts'
import WalletLogo from 'components/WalletLogo'
import { WalletEnum } from 'types/wallet'

interface Props {
  label: string
  walletEnum: WalletEnum
  address: string | null
  onConnect: () => void
  onDisconnect: () => void
}

const WalletBadge = ({
  label,
  walletEnum,
  address,
  onConnect,
  onDisconnect,
}: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(false)

  if (!address) {
    return (
      <button
        className="wallet-btn"
        onClick={onConnect}
        title={`Connect ${label}`}
      >
        <WalletLogo walleEnum={walletEnum} size={14} />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <ClickAwayListener onClickAway={(): void => setIsOpen(false)}>
      <div className="relative">
        <button
          className="wallet-btn wallet-btn--connected"
          onClick={(): void => setIsOpen((v) => !v)}
          title={`${label} connected`}
        >
          <WalletLogo walleEnum={walletEnum} size={14} />
          <span className="wallet-btn__addr mono">
            {UTIL.truncate(address, [6, 4])}
          </span>
          <span className="wallet-btn__dot" />
        </button>

        {isOpen && (
          <button
            className="btn btn--ghost btn--sm"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              minWidth: 120,
              justifyContent: 'flex-start',
              background: 'var(--bg-base)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
              zIndex: 30,
            }}
            onClick={(): void => {
              onDisconnect()
              setIsOpen(false)
            }}
          >
            Disconnect
          </button>
        )}
      </div>
    </ClickAwayListener>
  )
}

export default WalletBadge
