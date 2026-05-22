import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'

import { UTIL, NETWORK } from 'consts'

import SendStore from 'store/SendStore'
import SendProcessStore from 'store/SendProcessStore'

import useAsset from 'hooks/useAsset'
import useNetwork from 'hooks/useNetwork'

const Confirm = (): ReactElement => {
  const { formatBalance } = useAsset()

  const asset = useRecoilValue(SendStore.asset)
  const toAddress = useRecoilValue(SendStore.toAddress)
  const amount = useRecoilValue(SendStore.amount)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)

  const requestTxResult = useRecoilValue(SendProcessStore.requestTxResult)

  const { getScannerLink } = useNetwork()

  return (
    <div className="summary" style={{ border: 0, padding: 0 }}>
      <div className="summary__row">
        <span className="summary__k">Asset</span>
        <span className="summary__v">{asset?.symbol || '-'}</span>
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
          {formatBalance(amount)} {asset?.symbol || ''}
        </span>
      </div>
      <div className="summary__row">
        <span className="summary__k">Recipient</span>
        <span className="summary__v" style={{ fontSize: 'var(--fs-50)' }}>
          {toAddress ? UTIL.truncate(toAddress, [10, 8]) : '-'}
        </span>
      </div>
      {requestTxResult?.success && requestTxResult.hash && (
        <div className="summary__row">
          <span className="summary__k">Tx hash</span>
          <a
            className="summary__v text-link"
            href={getScannerLink({
              address: requestTxResult.hash,
              type: 'tx',
            })}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 'var(--fs-50)' }}
          >
            {UTIL.truncate(requestTxResult.hash, [10, 6])} ↗
          </a>
        </div>
      )}
    </div>
  )
}

export default Confirm
