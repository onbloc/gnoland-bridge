import { ReactElement } from 'react'

import { CHAIN_DISPLAY } from 'packages/union/dashboard-graphql'

const ChainBadge = ({ chainId }: { chainId: string }): ReactElement => {
  const chain = CHAIN_DISPLAY[chainId] ?? { name: chainId, color: '#9F9F9F' }

  return (
    <span className="tag">
      <span className="dot" style={{ background: chain.color }} />
      {chain.name}
    </span>
  )
}

export default ChainBadge
