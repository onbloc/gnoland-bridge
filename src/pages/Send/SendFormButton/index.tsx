import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'

import { ValidateItemResultType } from 'types/send'

import Button from 'components/Button'

import AuthStore from 'store/AuthStore'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

import SubmitButton from './SubmitButton'
import NextOrApproveButton from './NextOrApproveButton'

const SendFormButton = ({
  feeValidationResult,
}: {
  feeValidationResult: ValidateItemResultType
}): ReactElement => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const isFullyConnected = useRecoilValue(AuthStore.isFullyConnected)
  const status = useRecoilValue(SendProcessStore.sendProcessStatus)

  if (isFullyConnected) {
    return status === ProcessStatus.Input ? (
      <NextOrApproveButton feeValidationResult={feeValidationResult} />
    ) : (
      <SubmitButton />
    )
  }

  const label = !gnoWallet && !evmWallet
    ? 'Connect Adena and EVM wallets to continue'
    : !gnoWallet
      ? 'Connect Adena wallet to continue'
      : 'Connect an EVM wallet to continue'

  return <Button disabled>{label}</Button>
}

export default SendFormButton
