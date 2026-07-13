import { ReactElement, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'

import { NETWORK, UTIL } from 'consts'
import routes from 'consts/routes'
import { getRelayerChainId } from 'packages/relayer-api'

import PacketTracker from 'components/PacketTracker'
import SendStore from 'store/SendStore'

import useAsset from 'hooks/useAsset'

import { makeGnoscanTransactionUrl } from 'config/network'
import AuthStore from 'store/AuthStore'
import SendProcessStore from 'store/SendProcessStore'
import { isGnoChain } from 'types/network'

const Finish = (): ReactElement => {
  const { formatBalance } = useAsset()
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)

  const walletType = isGnoChain(fromBlockChain)
    ? gnoWallet?.walletType || 'Adena'
    : evmWallet?.walletType || 'EVM wallet'

  const asset = useRecoilValue(SendStore.asset)
  const [toAddress, setToAddress] = useRecoilState(SendStore.toAddress)
  const [amount, setAmount] = useRecoilState(SendStore.amount)

  const [requestTxResult, setRequestTxResult] = useRecoilState(
    SendProcessStore.requestTxResult,
  )
  const [waitForReceiptError, setWaitForReceiptError] = useRecoilState(
    SendProcessStore.waitForReceiptError,
  )

  const [displayAmount] = useState(amount)
  const [displayToAddress] = useState(toAddress)
  const [displayRequestTxResult] = useState(requestTxResult)
  const [displayErrorMessage] = useState(waitForReceiptError)
  const [displayAsset] = useState(asset)
  const [displayFromBlockChain] = useState(fromBlockChain)
  const [displayToBlockChain] = useState(toBlockChain)

  useEffect(() => {
    setToAddress('')
    setAmount('')
    setRequestTxResult({ success: false })
    setWaitForReceiptError('')
  }, [])

  const failed = !!displayErrorMessage

  const erc20Route = displayAsset
    ? routes.find(
        (r) => r.src === 'gnoland' && r.baseToken === displayAsset.denom,
      )
    : undefined
  const erc20Address = erc20Route?.quoteToken

  const canAddToWallet =
    !failed &&
    isGnoChain(displayFromBlockChain) &&
    !!erc20Address &&
    typeof window !== 'undefined' &&
    !!(window as { ethereum?: unknown }).ethereum

  const handleAddToWallet = async (): Promise<void> => {
    if (!canAddToWallet || !displayAsset || !erc20Address) return
    try {
      await (
        window as unknown as {
          ethereum: {
            request: (args: {
              method: string
              params: {
                type: string
                options: {
                  address: string
                  symbol: string
                  decimals: number
                }
              }
            }) => Promise<void>
          }
        }
      ).ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: erc20Address,
            symbol: displayAsset.symbol,
            // The ERC20 being registered is the destination-side wrapped
            // token (erc20Route.quoteToken), which can have different
            // decimals than displayAsset (source-chain-relative - see
            // useAsset.ts's getAssetList).
            decimals: erc20Route?.quoteDecimals ?? displayAsset.decimals,
          },
        },
      })
    } catch {
      // user rejected or wallet unavailable, silent fail
    }
  }

  // EVM tx hashes are 0x-prefixed -> Etherscan. Gno tx hashes go through
  // gnoScanUrl above so the RPC override still applies.
  const SEPOLIA_TX_URL = 'https://sepolia.etherscan.io/tx/'
  const sourceTxUrl =
    displayRequestTxResult?.success && displayRequestTxResult.hash
      ? displayRequestTxResult.hash.startsWith('0x')
        ? `${SEPOLIA_TX_URL}${displayRequestTxResult.hash}`
        : makeGnoscanTransactionUrl(displayRequestTxResult.hash)
      : undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-6) 0',
        }}
      >
        {failed ? (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '1.5px solid oklch(0.62 0.16 30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-2)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="oklch(0.62 0.16 30)"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '1.5px solid var(--bg-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-2)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--bg-brand)"
              strokeWidth="2"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        )}
        <h2
          style={{
            fontSize: 'var(--fs-600)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          {failed ? 'Transfer failed' : 'Transfer complete'}
        </h2>
        {failed ? (
          <p
            style={{
              color: 'oklch(0.62 0.16 30)',
              maxWidth: 380,
              margin: 0,
              fontSize: 'var(--fs-100)',
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayErrorMessage}
          </p>
        ) : (
          <>
            <p
              style={{
                color: 'var(--text-secondary)',
                margin: 0,
                fontSize: 'var(--fs-100)',
                textAlign: 'center',
              }}
            >
              {formatBalance(displayAmount)} {displayAsset?.symbol} delivered
              via {walletType} to{' '}
              <span className="mono">
                {displayToAddress
                  ? UTIL.truncate(displayToAddress, [10, 6])
                  : '-'}
              </span>
            </p>
            {canAddToWallet && (
              <button
                type="button"
                className="add-to-wallet"
                onClick={handleAddToWallet}
                style={{ marginTop: 'var(--space-2)' }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                Add {displayAsset?.symbol} to wallet
              </button>
            )}
          </>
        )}
      </div>

      <div className="summary" style={{ border: 0, padding: 0 }}>
        <div className="summary__row">
          <span className="summary__k">Asset</span>
          <span className="summary__v">{displayAsset?.symbol || '-'}</span>
        </div>
        <div className="summary__row">
          <span className="summary__k">From</span>
          <span className="summary__v">
            {NETWORK.blockChainName[fromBlockChain]}
          </span>
        </div>
        <div className="summary__row">
          <span className="summary__k">To</span>
          <span className="summary__v">
            {NETWORK.blockChainName[toBlockChain]}
          </span>
        </div>
        <div className="summary__row">
          <span className="summary__k">Amount</span>
          <span className="summary__v">
            {formatBalance(displayAmount)} {displayAsset?.symbol || ''}
          </span>
        </div>
        <div className="summary__row">
          <span className="summary__k">Recipient</span>
          <span className="summary__v" style={{ fontSize: 'var(--fs-50)' }}>
            {displayToAddress ? UTIL.truncate(displayToAddress, [10, 8]) : '-'}
          </span>
        </div>
        {displayRequestTxResult?.success &&
          displayRequestTxResult.packetHash && (
            <div className="summary__row">
              <span className="summary__k">Packet</span>
              <a
                className="summary__v text-link"
                href={`https://app.union.build/explorer/transfers/${displayRequestTxResult.packetHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 'var(--fs-50)' }}
              >
                {UTIL.truncate(displayRequestTxResult.packetHash, [10, 6])} ↗
              </a>
            </div>
          )}
        {displayRequestTxResult?.success &&
          displayRequestTxResult.hash &&
          sourceTxUrl && (
            <div className="summary__row">
              <span className="summary__k">Source Tx</span>
              <a
                className="summary__v text-link"
                href={sourceTxUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 'var(--fs-50)' }}
              >
                {UTIL.truncate(displayRequestTxResult.hash, [10, 6])} ↗
              </a>
            </div>
          )}
      </div>

      {displayRequestTxResult?.success && displayRequestTxResult.packetHash && (
        <PacketTracker
          packetHash={displayRequestTxResult.packetHash}
          sourceTxUrl={sourceTxUrl}
          senderAddress={
            isGnoChain(displayFromBlockChain)
              ? gnoWallet?.address
              : evmWallet?.address
          }
          sourceTxHash={displayRequestTxResult.hash}
          receiverAddress={displayToAddress}
          amount={displayAmount}
          sourceChainId={getRelayerChainId(displayFromBlockChain)}
          destinationChainId={getRelayerChainId(displayToBlockChain)}
        />
      )}
    </div>
  )
}

export default Finish
