import { ReactElement, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

const CircularProgress = ({ size = 16 }: { size?: number }): ReactElement => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      style={{ opacity: 0.25 }}
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      style={{ opacity: 0.75 }}
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

import Button from 'components/Button'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'
import FormErrorMessage from 'components/FormErrorMessage'
import useSend from 'hooks/useSend'

const SubmitButton = (): ReactElement => {
  const [status, setStatus] = useRecoilState(SendProcessStore.sendProcessStatus)

  const setRequestTxResult = useSetRecoilState(SendProcessStore.requestTxResult)
  const setWaitForReceiptError = useSetRecoilState(
    SendProcessStore.waitForReceiptError
  )

  const [errorMessage, setErrorMessage] = useState('')

  const { submitRequestTx } = useSend()

  const loading = [ProcessStatus.Pending, ProcessStatus.Submit].includes(status)

  const onClickSubmit = async (): Promise<void> => {
    setErrorMessage('')
    setWaitForReceiptError('')

    try {
      const submitResult = await submitRequestTx()
      setRequestTxResult(submitResult)

      if (submitResult.success) {
        setStatus(ProcessStatus.Done)
      } else {
        setErrorMessage(submitResult.errorMessage || 'Transaction failed')
        setWaitForReceiptError(
          submitResult.errorMessage || 'Transaction failed'
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(message)
      setWaitForReceiptError(message)
    }
  }

  return (
    <>
      <Button onClick={onClickSubmit} disabled={loading}>
        {loading ? (
          <>
            <CircularProgress size={16} />
            Waiting for confirmation…
          </>
        ) : (
          'Sign & bridge'
        )}
      </Button>
      <FormErrorMessage
        errorMessage={errorMessage}
        style={{ textAlign: 'center', marginTop: 10 }}
      />
    </>
  )
}

export default SubmitButton
