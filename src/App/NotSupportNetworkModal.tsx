import { ReactElement } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'

import DefaultModal from 'components/Modal'

import NetworkStore from 'store/NetworkStore'

const NotSupportNetworkModal = (): ReactElement => {
  const [isVisibleModal, setIsVisibleModal] = useRecoilState(
    NetworkStore.isVisibleNotSupportNetworkModal
  )

  const network = useRecoilValue(NetworkStore.triedNotSupportNetwork)

  return (
    <DefaultModal
      {...{
        isOpen: isVisibleModal,
        close: (): void => setIsVisibleModal(false),
      }}
      header={<span className="card__title">Unsupported network</span>}
    >
      <div
        style={{
          padding: 'var(--space-8) var(--space-6)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 'var(--fs-200)',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {network
            ? `Your wallet is connected to an unsupported network (${network.name}). Please switch to a supported network.`
            : 'Please switch to a supported network and refresh the page.'}
        </p>
      </div>
    </DefaultModal>
  )
}

export default NotSupportNetworkModal
