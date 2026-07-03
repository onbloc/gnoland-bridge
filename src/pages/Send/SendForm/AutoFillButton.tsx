import { ReactElement, useEffect, useRef } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'

import SendStore from 'store/SendStore'
import { isGnoChain, isEvmChain } from 'types/network'
import { WalletEnum } from 'types/wallet'
import adenaService from 'services/adenaService'
import useAuth from 'hooks/useAuth'

const isBrowser = typeof window !== 'undefined'
const isChrome =
  isBrowser &&
  /Chrome/.test(navigator.userAgent) &&
  !/Edg/.test(navigator.userAgent)
const isEdgeChromium = isBrowser && /Edg/.test(navigator.userAgent)

const linkBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 0,
  padding: 0,
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--fs-50)',
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--text-link)',
  cursor: 'pointer',
}

export default function AutoFillButton(): ReactElement {
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const setToAddress = useSetRecoilState(SendStore.toAddress)
  const { loginGno } = useAuth()
  const { setOpen } = useModal()
  const { address, isConnected } = useAccount()
  // Set when the user clicks "Use my wallet" while disconnected, so the
  // effect below knows to fill toAddress once ConnectKit finishes connecting.
  const awaitingEvmFill = useRef(false)

  useEffect(() => {
    setToAddress('')
  }, [toBlockChain])

  useEffect(() => {
    if (awaitingEvmFill.current && isConnected && address) {
      setToAddress(address)
      awaitingEvmFill.current = false
    }
  }, [isConnected, address, setToAddress])

  if (isEvmChain(toBlockChain)) {
    if (!(isBrowser && (isChrome || isEdgeChromium))) {
      return <></>
    }
    return (
      <button
        type="button"
        style={linkBtnStyle}
        onClick={(): void => {
          if (isConnected && address) {
            setToAddress(address)
            return
          }
          awaitingEvmFill.current = true
          setOpen(true)
        }}
      >
        Use my wallet
      </button>
    )
  }

  if (isGnoChain(toBlockChain)) {
    if (!(isBrowser && (isChrome || isEdgeChromium))) {
      return <></>
    }
    if (!adenaService.checkInstalled()) {
      return (
        <a
          href={adenaService.ADENA_APP_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            ...linkBtnStyle,
            textDecoration: 'none',
          }}
        >
          Install Adena
        </a>
      )
    }
    return (
      <button
        type="button"
        style={linkBtnStyle}
        onClick={async (): Promise<void> => {
          if (!adenaService.checkInstalled()) return
          try {
            const session = await adenaService.connect()
            await loginGno({
              address: session.address,
              chainId: session.chainId,
              publicKey: session.publicKey,
              networkName: session.networkName,
              rpcUrl: session.rpcUrl,
              walletType: WalletEnum.Adena,
            })
            setToAddress(session.address)
          } catch (e) {
            console.info('[adena] use-my-wallet aborted', e)
          }
        }}
      >
        Use my wallet
      </button>
    )
  }

  return <></>
}
