import { ReactElement, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'

import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

import useSendValidate from 'hooks/useSendValidate'

import SendForm from './SendForm'
import Confirm from './Confirm'
import Finish from './Finish'
import SendFormButton from './SendFormButton'
import BlockChainNetwork from './BlockChainNetwork'
import FinishButton from './FinishButton'
import SelectBridge from 'components/SelectBridge'
import AuthStore from 'store/AuthStore'
import useAuth from 'hooks/useAuth'
import SendStore from 'store/SendStore'
import NetworkStore from 'store/NetworkStore'
import { BlockChainType } from 'types/network'
import { WarningInfo } from './SendForm/WarningInfo'

const STEP_EYEBROW: Partial<Record<ProcessStatus, string>> = {
  [ProcessStatus.Confirm]: 'Step 02 / Confirm',
  [ProcessStatus.Submit]: 'Step 02 / Confirm',
  [ProcessStatus.Pending]: 'Step 03 / Bridging',
  [ProcessStatus.Done]: 'Step 04 / Complete',
  [ProcessStatus.Failed]: 'Step 04 / Failed',
}

const BackButton = ({ onClick }: { onClick: () => void }): ReactElement => (
  <button type="button" className="btn btn--ghost btn--sm" onClick={onClick}>
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
    Back
  </button>
)

const Send = (): ReactElement => {
  const [status, setStatus] = useRecoilState(SendProcessStore.sendProcessStatus)
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)
  const adenaExt = useRecoilValue(NetworkStore.adenaExt)
  const { getLoginStorage } = useAuth()
  const [initPage, setInitPage] = useState(false)
  const [toBlockChain, setToBlockChain] = useRecoilState(SendStore.toBlockChain)
  const [fromBlockChain, setFromBlockChain] = useRecoilState(
    SendStore.fromBlockChain
  )

  const { validateFee } = useSendValidate()
  const feeValidationResult = validateFee()

  const onClickBack = (): void => setStatus(ProcessStatus.Input)

  useEffect(() => {
    setInitPage(true)
    const { lastFromBlockChain, lastToBlockChain } = getLoginStorage()

    const sanitize = (b?: BlockChainType): BlockChainType | undefined =>
      b === BlockChainType.base ? BlockChainType.ethereum : b

    const restoredFrom = sanitize(lastFromBlockChain)
    const restoredTo = sanitize(lastToBlockChain)

    if (restoredFrom) {
      setFromBlockChain(restoredFrom)
      restoredTo && setToBlockChain(restoredTo)
    }
  }, [])

  useEffect(() => {
    if (initPage) {
      if (
        fromBlockChain !== BlockChainType.gnoland &&
        fromBlockChain !== toBlockChain
      ) {
        setToBlockChain(BlockChainType.gnoland)
      }
    }
  }, [fromBlockChain])

  const isInput = status === ProcessStatus.Input
  const isConfirmFlow = [
    ProcessStatus.Confirm,
    ProcessStatus.Submit,
    ProcessStatus.Pending,
  ].includes(status)
  const isFinished = [ProcessStatus.Done, ProcessStatus.Failed].includes(status)

  return (
    <div key={String(isLoggedIn)} style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="bridge-card">
        <div className="bridge-card__head">
          {isInput ? (
            <div>
              <div className="bridge-card__title">Bridge</div>
              <div className="card__sub">
                Send tokens in and out of gno.land.
              </div>
            </div>
          ) : (
            <BackButton onClick={onClickBack} />
          )}
          {isInput ? (
            <span className={`tag${adenaExt?.name ? ' tag--success' : ''}`}>
              <span className="dot" /> {adenaExt?.name || 'Not connected'}
            </span>
          ) : (
            <span className="section-title">{STEP_EYEBROW[status]}</span>
          )}
        </div>

        <div className="bridge-card__body">
          {isInput && (
            <>
              <BlockChainNetwork />
              <SelectBridge />
              <SendForm feeValidationResult={feeValidationResult} />
              <WarningInfo />
              <SendFormButton feeValidationResult={feeValidationResult} />
            </>
          )}

          {isConfirmFlow && (
            <>
              {status === ProcessStatus.Pending ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 'var(--space-6) 0',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div className="bridge-spinner" />
                  <h2
                    style={{
                      fontSize: 'var(--fs-600)',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.025em',
                      margin: 0,
                    }}
                  >
                    Bridging<span className="muted">…</span>
                  </h2>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      margin: 0,
                      fontSize: 'var(--fs-100)',
                    }}
                  >
                    Awaiting on-chain confirmation.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 'var(--space-4) 0',
                    gap: 'var(--space-2)',
                  }}
                >
                  <h2
                    style={{
                      fontSize: 'var(--fs-600)',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.025em',
                      margin: 0,
                    }}
                  >
                    Confirm transfer
                  </h2>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      margin: 0,
                      maxWidth: 360,
                      textAlign: 'center',
                      fontSize: 'var(--fs-100)',
                    }}
                  >
                    Review the details below. You&apos;ll sign this transaction
                    in your wallet.
                  </p>
                </div>
              )}
              <Confirm />
              <SendFormButton feeValidationResult={feeValidationResult} />
            </>
          )}

          {isFinished && (
            <>
              <Finish />
              <FinishButton />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Send
