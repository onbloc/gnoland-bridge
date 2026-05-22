import { ReactElement } from 'react'
import { useRecoilState } from 'recoil'

import { NETWORK } from 'consts'

import Button from 'components/Button'
import DefaultModal from 'components/Modal'

import SelectWalletStore, {
  SelectWalletModalType,
} from 'store/SelectWalletStore'

const AdenaDownModal = (): ReactElement => {
  const handleInstalled = (): void => {
    window.location.reload()
  }

  const [isVisibleModalType, setIsVisibleModalType] = useRecoilState(
    SelectWalletStore.isVisibleModalType
  )
  return (
    <DefaultModal
      {...{
        isOpen: isVisibleModalType === SelectWalletModalType.adenaInstall,
        close: (): void => setIsVisibleModalType(undefined),
      }}
      header={<span className="card__title">Install Adena</span>}
    >
      <div
        style={{
          padding: 'var(--space-8) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        {!navigator.userAgent.includes('Chrome') ? (
          <p
            style={{
              fontSize: 'var(--fs-200)',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            Bridge currently only supports desktop Chrome.
          </p>
        ) : (
          <>
            <p
              style={{
                fontSize: 'var(--fs-200)',
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              You&apos;ll need the{' '}
              <a
                href={NETWORK.ADENA_EXTENSION}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Adena extension
              </a>{' '}
              installed to connect your wallet.
            </p>
            <Button onClick={handleInstalled}>I installed it</Button>
          </>
        )}
      </div>
    </DefaultModal>
  )
}

export default AdenaDownModal
