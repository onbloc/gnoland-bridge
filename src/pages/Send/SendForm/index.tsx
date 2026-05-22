import { ReactElement, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'

import { useDebouncedCallback } from 'use-debounce'
import BigNumber from 'bignumber.js'
import { ArrowClockwise } from 'components/icons'

import { ValidateItemResultType } from 'types/send'
import FormErrorMessage from 'components/FormErrorMessage'

import useSendValidate from 'hooks/useSendValidate'
import useAsset from 'hooks/useAsset'

import AuthStore from 'store/AuthStore'
import SendStore from 'store/SendStore'

import AssetList from './AssetList'
import AutoFillButton from './AutoFillButton'

const RefreshButton = (): ReactElement => {
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)
  const { getAssetList } = useAsset()
  const [refreshing, setRefreshing] = useState(false)
  const dbcRefresh = useDebouncedCallback(() => {
    setRefreshing(true)
    getAssetList().finally((): void => {
      setTimeout(() => {
        setRefreshing(false)
      }, 500)
    })
  }, 300)

  if (!isLoggedIn) return <></>

  return (
    <button
      type="button"
      className="field__hint"
      onClick={(): void => dbcRefresh()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 0,
        padding: 0,
        cursor: refreshing ? 'default' : 'pointer',
        color: 'var(--bg-brand)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        opacity: refreshing ? 0.5 : 1,
      }}
    >
      <ArrowClockwise size={12} />
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}

const SendForm = ({
  feeValidationResult,
}: {
  feeValidationResult: ValidateItemResultType
}): ReactElement => {
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const evmWallet = useRecoilValue(AuthStore.evmWallet)
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)

  const asset = useRecoilValue(SendStore.asset)
  const [toAddress, setToAddress] = useRecoilState(SendStore.toAddress)
  const [amount, setAmount] = useRecoilState(SendStore.amount)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)

  const [validationResult, setValidationResult] = useRecoilState(
    SendStore.validationResult
  )

  const [inputAmount, setInputAmount] = useState('')

  const { formatBalance, getAssetList, getDecimals } = useAsset()
  const { validateSendData } = useSendValidate()

  const onChangeToAddress = ({ value }: { value: string }): void => {
    setToAddress(value)
  }

  const onChangeAmount = ({ value }: { value: string }): void => {
    if (!value || value.length === 0) {
      setInputAmount('')
      setAmount('')
      return
    }
    if (!isNaN(Number(value))) {
      setInputAmount(value)
      const decimalSize = new BigNumber(getDecimals())
      setAmount(new BigNumber(value).times(decimalSize).toString(10))
    }
  }

  const onClickMaxButton = async (): Promise<void> => {
    const assetAmount = new BigNumber(asset?.balance || 0)
    onChangeAmount({ value: formatBalance(assetAmount) })
  }

  const dbcGetValidation = useDebouncedCallback(async () => {
    setValidationResult({ isValid: false })
    const sendDataResult = await validateSendData()
    setValidationResult(sendDataResult)
  }, 300)

  useEffect(() => {
    dbcGetValidation()
    return (): void => {
      dbcGetValidation.cancel()
    }
  }, [amount, toAddress, toBlockChain, fromBlockChain, asset])

  useEffect(() => {
    onChangeAmount({ value: inputAmount })
    getAssetList().then((): void => {
      dbcGetValidation()
    })
  }, [gnoWallet, evmWallet, toBlockChain, fromBlockChain])

  const balanceText = asset
    ? `${formatBalance(asset.balance || '0', asset.denom)} ${asset.symbol}`
    : '-'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      {/* Asset */}
      <div className="field">
        <label className="field__label">
          <span>Asset</span>
          <RefreshButton />
        </label>
        <AssetList selectedAsset={asset} onChangeAmount={onChangeAmount} />
      </div>

      {/* Amount */}
      <div className="field">
        <label className="field__label">
          <span>Amount</span>
          <span className="field__hint">Balance: {balanceText}</span>
        </label>
        <div className="amount-input">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={inputAmount}
            onChange={({ target: { value } }): void =>
              onChangeAmount({ value: value.replace(/[^0-9.]/g, '') })
            }
          />
          <button
            type="button"
            className="amount-input__max"
            onClick={onClickMaxButton}
          >
            MAX
          </button>
        </div>
        {isLoggedIn && (
          <FormErrorMessage
            errorMessage={validationResult.errorMessage?.amount}
          />
        )}
      </div>

      {/* Destination address */}
      <div className="field">
        <label className="field__label">
          <span>Destination</span>
          <AutoFillButton />
        </label>
        <input
          className="input input--mono"
          type="text"
          placeholder="Recipient address"
          value={toAddress}
          onChange={({ target: { value } }): void =>
            onChangeToAddress({ value })
          }
        />
        <FormErrorMessage
          errorMessage={validationResult.errorMessage?.toAddress}
        />
      </div>
    </div>
  )
}

export default SendForm
