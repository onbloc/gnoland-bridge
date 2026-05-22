import { ReactElement } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'

import { ValidateItemResultType } from 'types/send'

import Button from 'components/Button'

import SendStore from 'store/SendStore'
import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

const NextOrApproveButton = ({
  feeValidationResult,
}: {
  feeValidationResult: ValidateItemResultType
}): ReactElement => {
  const setStatus = useSetRecoilState(SendProcessStore.sendProcessStatus)
  const asset = useRecoilValue(SendStore.asset)

  const validationResult = useRecoilValue(SendStore.validationResult)
  const ableButton = validationResult.isValid && feeValidationResult.isValid

  const onClickNext = async (): Promise<void> => {
    setStatus(ProcessStatus.Confirm)
  }

  return (
    <Button onClick={onClickNext} disabled={!ableButton}>
      {asset ? `Bridge ${asset.symbol} →` : 'Bridge →'}
    </Button>
  )
}

export default NextOrApproveButton
