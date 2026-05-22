import { ReactElement } from 'react'

const StatusBadge = ({
  success,
}: {
  success: boolean | null
}): ReactElement => {
  if (success === true) {
    return (
      <span className="tag tag--success">
        <span className="dot" />
        Success
      </span>
    )
  }
  if (success === false) {
    return (
      <span className="tag tag--fail">
        <span className="dot" />
        Failed
      </span>
    )
  }
  return (
    <span className="tag tag--pending">
      <span className="bridge-dot-pulse" />
      Pending
    </span>
  )
}

export default StatusBadge
