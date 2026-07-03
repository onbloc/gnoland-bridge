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
  iconSrc,
}: {
  walleEnum: WalletEnum
  size?: number
  style?: React.CSSProperties
  // Overrides the static per-WalletEnum icon with the actual connected
  // EIP-6963 wallet's own announced icon (e.g. Rabby, Coinbase Wallet)
  // instead of always showing the MetaMask logo.
  iconSrc?: string
}): ReactElement => {
  if (iconSrc) {
    return <FormImage src={iconSrc} size={size} style={style} />
  }

  const Logo = walletLogo[walleEnum]

  return typeof Logo === 'string' ? (
    <FormImage src={Logo} size={size} style={style} />
  ) : (
    <Logo size={size} color={COLOR.primary} style={style} />
  )
}

export default WalletLogo
