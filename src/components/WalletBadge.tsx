import { ReactElement, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  iconSrc?: string
}

const WalletBadge = ({
  label,
  walletEnum,
  address,
  onConnect,
  onDisconnect,
  iconSrc,
}: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  if (!address) {
    return (
      <button
        className="wallet-btn"
        onClick={onConnect}
        title={`Connect ${label}`}
      >
        <WalletLogo walleEnum={walletEnum} size={14} iconSrc={iconSrc} />
        <span>{label}</span>
      </button>
    )
  }

  const openMenu = (): void => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setIsOpen((v) => !v)
  }

  return (
    <ClickAwayListener onClickAway={(): void => setIsOpen(false)}>
      <div className="relative">
        <button
          ref={buttonRef}
          className="wallet-btn wallet-btn--connected"
          onClick={openMenu}
          title={`${label} connected`}
        >
          <WalletLogo walleEnum={walletEnum} size={14} iconSrc={iconSrc} />
          <span className="wallet-btn__addr mono">
            {UTIL.truncate(address, [6, 4])}
          </span>
          <span className="wallet-btn__dot" />
        </button>

        {isOpen &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: menuPos.top,
                right: menuPos.right,
                minWidth: 140,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-base)',
                boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                zIndex: 100,
              }}
            >
              <button
                className="btn btn--ghost btn--sm"
                style={{ justifyContent: 'flex-start' }}
                onClick={(): void => {
                  onDisconnect()
                  setIsOpen(false)
                }}
              >
                Disconnect
              </button>
            </div>,
            document.body
          )}
      </div>
    </ClickAwayListener>
  )
}

export default WalletBadge
