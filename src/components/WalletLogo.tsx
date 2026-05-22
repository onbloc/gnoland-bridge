import { ComponentType, ReactElement, SVGAttributes } from 'react'

import { COLOR } from 'consts'

import MetamaskSvg from 'images/metamask.svg'
import AdenaSvg from 'images/adena.svg'
import { WalletEnum } from 'types/wallet'
import FormImage from './FormImage'

interface IconProps extends SVGAttributes<SVGElement> {
  color?: string
  size?: string | number
}

const walletLogo: Record<WalletEnum, string | ComponentType<IconProps>> = {
  [WalletEnum.MetaMask]: MetamaskSvg,
  [WalletEnum.Adena]: AdenaSvg,
}

const WalletLogo = ({
  walleEnum,
  size = 24,
  style,
}: {
  walleEnum: WalletEnum
  size?: number
  style?: React.CSSProperties
}): ReactElement => {
  const Logo = walletLogo[walleEnum]

  return typeof Logo === 'string' ? (
    <FormImage src={Logo} size={size} style={style} />
  ) : (
    <Logo size={size} color={COLOR.primary} style={style} />
  )
}

export default WalletLogo
