import { ReactElement } from 'react'
import { useRecoilValue } from 'recoil'

import SendProcessStore, { ProcessStatus } from 'store/SendProcessStore'
import SendStore from 'store/SendStore'

const WarningIcon = (): ReactElement => (
  <svg
    className="alert__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M12 2 L22 20 H2 Z" />
    <path d="M12 10v4M12 18h.01" />
  </svg>
)

const InfoIcon = (): ReactElement => (
  <svg
    className="alert__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
)

const DangerIcon = (): ReactElement => (
  <svg
    className="alert__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
)

export const DangerElement = ({
  children,
}: {
  children: React.ReactNode
}): ReactElement => {
  return (
    <div className="alert alert--error">
      <DangerIcon />
      <div>{children}</div>
    </div>
  )
}

export const WarningElement = ({
  children,
}: {
  children: React.ReactNode
}): ReactElement => {
  return (
    <div className="alert alert--warning">
      <WarningIcon />
      <div>{children}</div>
    </div>
  )
}

export const InfoElement = ({
  style,
  children,
}: {
  style?: React.CSSProperties
  children: React.ReactNode
}): ReactElement => {
  return (
    <div className="alert" style={style}>
      <InfoIcon />
      <div>{children}</div>
    </div>
  )
}

export const WarningInfo = (): ReactElement => {
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const status = useRecoilValue(SendProcessStore.sendProcessStatus)

  if (status !== ProcessStatus.Input) return <></>
  if (fromBlockChain === toBlockChain) return <></>

  return (
    <WarningElement>
      Don&apos;t use exchange addresses for cross-chain transfers. Make sure
      that the token type is correct before making transfers to the exchanges.
    </WarningElement>
  )
}
