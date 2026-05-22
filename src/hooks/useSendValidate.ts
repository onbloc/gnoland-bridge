import { useRecoilValue } from 'recoil'
import { isAddress } from 'viem'

import BigNumber from 'bignumber.js'

import SendStore from 'store/SendStore'

import {
  BlockChainType,
  isGnoChain,
  isEvmChain,
  GNOLAND_BECH32_PREFIX,
} from 'types/network'
import { ValidateItemResultType, ValidateResultType } from 'types/send'

import useAsset from './useAsset'
import { NETWORK } from 'consts'
import { SUPPORTED_ASSETS } from 'types/asset'

const useSendValidate = (): {
  validateFee: () => ValidateItemResultType
  validateSendData: () => Promise<ValidateResultType>
} => {
  const { formatBalance } = useAsset()

  // Send Data
  const asset = useRecoilValue(SendStore.asset)
  const toAddress = useRecoilValue(SendStore.toAddress)
  const amount = useRecoilValue(SendStore.amount)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)

  const validateFee = (): ValidateItemResultType => {
    // Fee validation is handled by the Union bridge
    return { isValid: true }
  }

  const validateAsset = (): ValidateItemResultType => {
    if (asset?.disabled) {
      return {
        isValid: false,
        errorMessage: `${asset.symbol} is not available on ${NETWORK.blockChainName[toBlockChain]}`,
      }
    }

    return { isValid: true }
  }

  const validateToAddress = async (): Promise<ValidateItemResultType> => {
    if (!toAddress || toAddress.length === 0) {
      return { isValid: false, errorMessage: '' }
    }

    let validAddress = false

    if (isGnoChain(toBlockChain)) {
      if (
        toAddress.startsWith(GNOLAND_BECH32_PREFIX) &&
        toAddress.length >= 39 &&
        toAddress.length <= 64
      ) {
        validAddress = true
      }
    } else if (isEvmChain(toBlockChain)) {
      validAddress = isAddress(toAddress)
    }

    if (false === validAddress) {
      return { isValid: false, errorMessage: 'Invalid address' }
    }

    return { isValid: true }
  }

  const validateAmount = (): ValidateItemResultType => {
    if (!amount || amount.length === 0) {
      return { isValid: false, errorMessage: '' }
    }

    const bnAmount = new BigNumber(amount)

    if (bnAmount.isNaN() || bnAmount.isNegative() || bnAmount.isZero()) {
      return { isValid: false, errorMessage: 'Amount must be greater than 0' }
    }

    if (false === bnAmount.isInteger()) {
      return {
        isValid: false,
        errorMessage: `Amount must be within 6 decimal points`,
      }
    }

    const selectedAssetBalance = new BigNumber(asset?.balance || '0')

    if (selectedAssetBalance.isLessThanOrEqualTo(0)) {
      return {
        isValid: false,
        errorMessage: 'Insufficient balance',
      }
    }

    if (bnAmount.isGreaterThan(selectedAssetBalance)) {
      return {
        isValid: false,
        errorMessage: `Amount must be between 0 and ${formatBalance(
          selectedAssetBalance.toString()
        )}`,
      }
    }

    return { isValid: true }
  }

  const validateSendData = async (): Promise<ValidateResultType> => {
    const toAddressValidResult = await validateToAddress()
    const amountValidResult = validateAmount()
    const assetValidResult = validateAsset()

    return {
      isValid: [
        toAddressValidResult,
        amountValidResult,
        assetValidResult,
      ].every((x) => x.isValid),
      errorMessage: {
        toAddress: toAddressValidResult.errorMessage,
        amount: amountValidResult.errorMessage,
      },
    }
  }

  return {
    validateFee,
    validateSendData,
  }
}

export default useSendValidate
