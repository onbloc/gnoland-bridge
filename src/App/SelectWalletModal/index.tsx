import { ReactElement } from 'react'

// Wallet connection is now handled directly in Header via WalletBadge buttons.
// This component is kept as a no-op to avoid breaking imports.
const SelectWalletModal = (): ReactElement => {
  return <></>
}

export default SelectWalletModal
