import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'

import { ValidateItemResultType } from 'types/send'
import { isGnoChain } from 'types/network'

import Button from 'components/Button'

import AuthStore from 'store/AuthStore'
import SendStore from 'store/SendStore'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

import SubmitButton from './SubmitButton'
import NextOrApproveButton from './NextOrApproveButton'

const SendFormButton = ({
  feeValidationResult,
}: {
  feeValidationResult: ValidateItemResultType
}): ReactElement => {
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const status = useRecoilValue(SendProcessStore.sendProcessStatus)

  if (isLoggedIn) {
    return status === ProcessStatus.Input ? (
      <NextOrApproveButton feeValidationResult={feeValidationResult} />
    ) : (
      <SubmitButton />
    )
  }

  const walletName = isGnoChain(fromBlockChain) ? 'Adena' : 'an EVM'

  return <Button disabled>Connect {walletName} wallet to continue</Button>
}

export default SendFormButton
