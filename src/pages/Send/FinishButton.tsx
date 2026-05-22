import { ReactElement } from 'react'
import { useSetRecoilState } from 'recoil'

import Button from 'components/Button'

import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'

const FinishButton = (): ReactElement => {
  const setStatus = useSetRecoilState(SendProcessStore.sendProcessStatus)

  return (
    <Button onClick={(): void => setStatus(ProcessStatus.Input)}>
      New transfer
    </Button>
  )
}

export default FinishButton
