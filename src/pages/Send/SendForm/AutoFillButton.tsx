import { ReactElement, useEffect } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'

import SendStore from 'store/SendStore'
import { isGnoChain, isEvmChain } from 'types/network'
import { WalletEnum } from 'types/wallet'
import adenaService from 'services/adenaService'
import metaMaskService from 'services/metaMaskService'
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
  const { loginEvm, loginGno } = useAuth()

  useEffect(() => {
    setToAddress('')
  }, [toBlockChain])

  if (isEvmChain(toBlockChain)) {
    if (!(isBrowser && (isChrome || isEdgeChromium))) {
      return <></>
    }
    if (!metaMaskService.checkInstalled()) {
      return (
        <a
          className="text-link"
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          style={{
            ...linkBtnStyle,
            color: 'var(--text-link)',
            textDecoration: 'none',
          }}
        >
          Install MetaMask
        </a>
      )
    }
    return (
      <button
        type="button"
        style={linkBtnStyle}
        onClick={async (): Promise<void> => {
          if (!metaMaskService.checkInstalled()) return
          try {
            const { address, provider } = await metaMaskService.connect()
            if (!address) return
            const walletClient = createWalletClient({
              account: address as `0x${string}`,
              chain: mainnet,
              transport: custom(provider),
            })
            await loginEvm({
              address,
              walletClient,
              walletType: WalletEnum.MetaMask,
            })
            setToAddress(address)
          } catch (e) {
            console.info('[metamask] use-my-wallet aborted', e)
          }
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
