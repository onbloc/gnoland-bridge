import { ReactElement } from 'react'

import { BridgeType } from 'types/network'

const SelectBridge = (): ReactElement => {
  return (
    <div className="bridge-method-line">
      Bridge:{' '}
      <span className="bridge-method-line__name">
        {BridgeType.union.toUpperCase()}
      </span>
    </div>
  )
}

export default SelectBridge
