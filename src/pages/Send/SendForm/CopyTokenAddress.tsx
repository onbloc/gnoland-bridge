import { ReactElement, useState } from 'react'

import { AssetType } from 'types/asset'
import routes from 'consts/routes'

function getTokenAddresses(denom: string): { gno?: string; eth?: string } {
  const route = routes.find((r) => r.denom === denom)
  if (!route) return {}
  return route.src === 'gnoland'
    ? { gno: route.baseToken, eth: route.quoteToken }
    : { gno: route.quoteToken, eth: route.baseToken }
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

const CopyIcon = (): ReactElement => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
)

const CheckIcon = (): ReactElement => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

type CopiedChain = 'gno' | 'eth' | null

export default function CopyTokenAddress({
  asset,
}: {
  asset: AssetType
}): ReactElement {
  const [copied, setCopied] = useState<CopiedChain>(null)
  const { gno, eth } = getTokenAddresses(asset.denom)

  if (!gno && !eth) return <></>

  const copy = async (chain: 'gno' | 'eth', address: string): Promise<void> => {
    await copyToClipboard(address)
    setCopied(chain)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="copy-token-addr">
      <span className="copy-token-addr__label">
        Copy {asset.symbol} token address
      </span>
      {gno && (
        <button
          type="button"
          className={`copy-token-addr__chip${
            copied === 'gno' ? ' is-copied' : ''
          }`}
          onClick={(): Promise<void> => copy('gno', gno)}
        >
          {copied === 'gno' ? <CheckIcon /> : <CopyIcon />}
          Gno.land
        </button>
      )}
      {eth && (
        <button
          type="button"
          className={`copy-token-addr__chip${
            copied === 'eth' ? ' is-copied' : ''
          }`}
          onClick={(): Promise<void> => copy('eth', eth)}
        >
          {copied === 'eth' ? <CheckIcon /> : <CopyIcon />}
          Ethereum
        </button>
      )}
    </div>
  )
}
