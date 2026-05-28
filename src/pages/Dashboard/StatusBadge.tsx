import { ReactElement } from 'react'

import type { RelayerTransferStatus } from 'packages/relayer-api'

const StatusBadge = ({
  status,
}: {
  status: RelayerTransferStatus
}): ReactElement => {
  if (status === 2) {
    return (
      <span className="tag tag--success">
        <span className="dot" />
        Done
      </span>
    )
  }
  if (status === 3) {
    return (
      <span className="tag tag--fail">
        <span className="dot" />
        Failed
      </span>
    )
  }
  if (status === 0) {
    return (
      <span className="tag tag--pending">
        <span className="bridge-dot-pulse" />
        Detected
      </span>
    )
  }
  return (
    <span className="tag tag--pending">
      <span className="bridge-dot-pulse" />
      Processing
    </span>
  )
}

export default StatusBadge
