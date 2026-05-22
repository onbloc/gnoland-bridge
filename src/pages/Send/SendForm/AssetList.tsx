import { ReactElement, useEffect, useRef, useState } from 'react'

import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

import { AssetType } from 'types/asset'

import DefaultModal from 'components/Modal'

import useAsset from 'hooks/useAsset'
import AuthStore from 'store/AuthStore'
import SendStore from 'store/SendStore'
import ContractStore from 'store/ContractStore'

import { InfoElement } from './WarningInfo'

const AssetLogo = ({ asset }: { asset?: AssetType }): ReactElement => (
  <div
    className="asset-logo"
    style={{
      background: 'var(--bg-surface-1)',
    }}
  >
    {asset?.logoURI ? (
      <img
        src={asset.logoURI}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    ) : (
      <span>?</span>
    )}
  </div>
)

const AssetItem = ({
  asset,
  selected,
  setShowModal,
  onChangeAmount,
}: {
  asset: AssetType
  selected: boolean
  setShowModal: (value: boolean) => void
  onChangeAmount: ({ value }: { value: string }) => void
}): ReactElement => {
  const [oriAsset, setAsset] = useRecoilState(SendStore.asset)
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)

  const { formatBalance } = useAsset()

  return (
    <button
      type="button"
      className="asset-row"
      style={{
        marginBottom: 2,
        border: 0,
        background: selected ? 'var(--bg-surface-1)' : 'transparent',
        cursor: 'pointer',
      }}
      onClick={(): void => {
        if (oriAsset !== asset) {
          onChangeAmount({ value: '' })
        }
        setAsset(asset)
        setShowModal(false)
      }}
    >
      <AssetLogo asset={asset} />
      <div className="asset-row__main">
        <div className="asset-row__name">{asset.symbol}</div>
        <div className="asset-row__sub">{asset.name}</div>
      </div>
      {isLoggedIn && (
        <div className="asset-row__balance">
          {asset.balance ? formatBalance(asset.balance, asset.denom) : '0'}
          <span className="sub">{asset.symbol}</span>
        </div>
      )}
    </button>
  )
}

const SelectAssetButton = ({
  asset,
  setShowModal,
}: {
  asset?: AssetType
  setShowModal: (value: boolean) => void
}): ReactElement => {
  const { formatBalance } = useAsset()
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)

  return (
    <button
      type="button"
      className="asset-row"
      onClick={(): void => setShowModal(true)}
    >
      <AssetLogo asset={asset} />
      <div className="asset-row__main">
        <div className="asset-row__name">{asset?.symbol || 'Select asset'}</div>
        <div className="asset-row__sub">{asset?.name || ''}</div>
      </div>
      {asset && isLoggedIn && (
        <div className="asset-row__balance">
          {asset.balance ? formatBalance(asset.balance, asset.denom) : '0'}
          <span className="sub">{asset.symbol}</span>
        </div>
      )}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
}

const AssetList = ({
  selectedAsset,
  onChangeAmount,
}: {
  selectedAsset?: AssetType
  onChangeAmount: ({ value }: { value: string }) => void
}): ReactElement => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const assetList = useRecoilValue(ContractStore.assetList)
  const setAsset = useSetRecoilState(SendStore.asset)
  const [showModal, setShowModal] = useState(false)
  const [inputFilter, setInputFilter] = useState('')

  const filteredAssetList = assetList.filter((x) => {
    const inputFilterLower = inputFilter.toLowerCase()
    return inputFilterLower
      ? x.name.toLowerCase().includes(inputFilterLower) ||
          x.symbol.toLowerCase().includes(inputFilterLower)
      : true
  })

  useEffect(() => {
    if (showModal) {
      setInputFilter('')
      scrollRef.current?.scrollTo({ top: 200, behavior: 'smooth' })
    }
  }, [showModal])

  useEffect(() => {
    if (Array.isArray(assetList) && assetList.length > 0) {
      if (selectedAsset) {
        setAsset(
          assetList.find((x) => x.denom === selectedAsset.denom) || assetList[0]
        )
      } else {
        setAsset(assetList[0])
      }
    }
  }, [assetList])

  return (
    <>
      <SelectAssetButton asset={selectedAsset} setShowModal={setShowModal} />
      <DefaultModal
        {...{
          isOpen: showModal,
          close: (): void => setShowModal(false),
        }}
        header={<span className="card__title">Select Asset</span>}
      >
        <div
          style={{
            padding: 'var(--space-6)',
            background: 'var(--bg-base)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <input
            className="input"
            placeholder="Search"
            value={inputFilter}
            maxLength={30}
            onChange={({ currentTarget: { value } }): void =>
              setInputFilter(value)
            }
          />
          <div
            ref={scrollRef}
            style={{
              maxHeight: 'min(500px, 60vh)',
              overflowY: 'auto',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--r-1)',
              padding: 4,
            }}
          >
            {filteredAssetList.length > 0 ? (
              filteredAssetList.map((asset, index) => (
                <AssetItem
                  key={`asset-${index}`}
                  asset={asset}
                  selected={asset.denom === selectedAsset?.denom}
                  setShowModal={setShowModal}
                  onChangeAmount={onChangeAmount}
                />
              ))
            ) : (
              <div
                style={{
                  padding: 'var(--space-5)',
                  fontSize: 'var(--fs-100)',
                  color: 'var(--text-secondary)',
                }}
              >
                {inputFilter
                  ? `"${inputFilter}" does not exist`
                  : 'Asset list is empty'}
              </div>
            )}
          </div>
          <InfoElement>
            If you can&apos;t find your asset, try switching the chain or bridge
            route.
          </InfoElement>
        </div>
      </DefaultModal>
    </>
  )
}

export default AssetList
