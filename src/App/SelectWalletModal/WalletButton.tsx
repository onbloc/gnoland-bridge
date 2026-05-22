import { ReactElement } from 'react'
import { InfoCircle } from 'components/icons'

import Button from 'components/Button'
import { WalletEnum, WalletSupportBrowser, WalletTitle } from 'types/wallet'
import WalletLogo from 'components/WalletLogo'
import { Text } from 'components'

const WalletButton = ({
  wallet,
  onClick,
}: {
  wallet: WalletEnum
  onClick: () => void
}): ReactElement => {
  const { isSupport, errorMessage } = WalletSupportBrowser[wallet]
  return (
    <Button
      disabled={false === isSupport}
      onClick={onClick}
      className="rounded-[10px] p-4 my-2 border border-[#1e2026] transition-all duration-300 bg-[#202020] text-white overflow-hidden hover:border-bridge-sky hover:bg-[#202020]"
    >
      <div className="flex flex-row justify-between items-center">
        <div style={{ textAlign: 'left' }}>
          <Text>{WalletTitle[wallet]}</Text>
          {false === isSupport && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InfoCircle style={{ marginRight: 5 }} />
              <Text className="text-xs font-normal tracking-[-0.28px]">
                {errorMessage}
              </Text>
            </div>
          )}
        </div>
        <WalletLogo walleEnum={wallet} />
      </div>
    </Button>
  )
}

export default WalletButton
