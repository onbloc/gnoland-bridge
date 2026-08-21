import { ReactElement, useEffect } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useModal } from 'connectkit'

import AuthStore from 'store/AuthStore'
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
const isSupportedBrowser = isBrowser && (isChrome || isEdgeChromium)

const connectBtnStyle: React.CSSProperties = {
  textAlign: 'left',
  cursor: 'pointer',
  color: 'var(--text-muted)',
}

// Destination is always the wallet already linked for toBlockChain, never
// free text, so a mistyped or wrong-chain address can never be submitted.
export default function DestinationField(): ReactElement {
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const setToAddress = useSetRecoilState(SendStore.toAddress)
  const { loginGno } = useAuth()
  const { setOpen } = useModal()

  const linkedAddress = isGnoChain(toBlockChain)
    ? gnoWallet?.address
    : isEvmChain(toBlockChain)
      ? evmWallet?.address
      : undefined

  useEffect(() => {
    setToAddress(linkedAddress || '')
  }, [linkedAddress, setToAddress])

  if (linkedAddress) {
    return (
      <input
        className="input input--mono"
        type="text"
        value={linkedAddress}
        readOnly
      />
    )
  }

  const placeholder = isGnoChain(toBlockChain)
    ? 'Your Gno.land address'
    : isEvmChain(toBlockChain)
      ? 'Your EVM address'
      : ''

  if (!isSupportedBrowser) {
    return (
      <input
        className="input input--mono"
        type="text"
        value=""
        placeholder={placeholder}
        readOnly
      />
    )
  }

  if (isEvmChain(toBlockChain)) {
    return (
      <button
        type="button"
        className="input input--mono"
        style={connectBtnStyle}
        onClick={(): void => setOpen(true)}
      >
        {placeholder}
      </button>
    )
  }

  if (isGnoChain(toBlockChain)) {
    if (!adenaService.checkInstalled()) {
      return (
        <a
          href={adenaService.ADENA_APP_URL}
          target="_blank"
          rel="noreferrer"
          className="input input--mono"
          style={{ ...connectBtnStyle, display: 'block', textDecoration: 'none' }}
        >
          Install Adena to connect
        </a>
      )
    }
    return (
      <button
        type="button"
        className="input input--mono"
        style={connectBtnStyle}
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
          } catch (e) {
            console.info('[adena] connect for destination aborted', e)
          }
        }}
      >
        {placeholder}
      </button>
    )
  }

  return <input className="input input--mono" type="text" value="" readOnly />
}
