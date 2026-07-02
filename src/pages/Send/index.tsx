import { ReactElement, useEffect } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

import useSendValidate from 'hooks/useSendValidate'

import SendForm from './SendForm'
import Confirm from './Confirm'
import Finish from './Finish'
import SendFormButton from './SendFormButton'
import BlockChainNetwork from './BlockChainNetwork'
import FinishButton from './FinishButton'
import SelectBridge from 'components/SelectBridge'
import NetworkSelector from 'components/NetworkSelector'
import YourActivity from 'components/YourActivity'
import AuthStore from 'store/AuthStore'
import useAuth from 'hooks/useAuth'
import useWalletActivity from 'hooks/useWalletActivity'
import SendStore from 'store/SendStore'
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
  const { getLoginStorage } = useAuth()
  const setToBlockChain = useSetRecoilState(SendStore.toBlockChain)
  const setFromBlockChain = useSetRecoilState(SendStore.fromBlockChain)

  const { validateFee } = useSendValidate()
  const feeValidationResult = validateFee()
  const walletActivity = useWalletActivity()

  const onClickBack = (): void => setStatus(ProcessStatus.Input)

  useEffect(() => {
    const { lastFromBlockChain, lastToBlockChain } = getLoginStorage()

    if (lastFromBlockChain) {
      setFromBlockChain(lastFromBlockChain)
      lastToBlockChain && setToBlockChain(lastToBlockChain)
    }
  }, [])

  const isInput = status === ProcessStatus.Input
  const isConfirmFlow = [
    ProcessStatus.Confirm,
    ProcessStatus.Submit,
    ProcessStatus.Pending,
  ].includes(status)
  const isFinished = [ProcessStatus.Done, ProcessStatus.Failed].includes(status)

  return (
    <div key={String(isLoggedIn)} className="send-page">
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
            <NetworkSelector />
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
      {isInput && (
        <YourActivity
          items={walletActivity.items}
          loading={walletActivity.loading}
          error={walletActivity.error?.message}
          emptyText={
            walletActivity.senderAddress
              ? 'No activity yet'
              : 'Connect a source wallet to view activity'
          }
        />
      )}
    </div>
  )
}

export default Send
