export enum WalletEnum {
  MetaMask = 'MetaMask',
  Adena = 'Adena',
}

export const WalletTitle: Record<WalletEnum, string> = {
  MetaMask: 'MetaMask',
  Adena: 'Adena (Extension)',
}

export const WalletSupportBrowser: Record<
  WalletEnum,
  { isSupport: boolean; errorMessage: string }
> = {
  MetaMask: {
    isSupport: true,
    errorMessage: 'Available for desktop Chrome and Firefox.',
  },
  Adena: {
    isSupport: true,
    errorMessage: 'Available for desktop Chrome.',
  },
}
