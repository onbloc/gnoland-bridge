import { ReactElement, useState } from 'react'
import Modal from 'react-modal'
import { X } from 'components/icons'

Modal.setAppElement('#root')

const DefaultModal = ({
  isOpen,
  close,
  children,
  onRequestClose,
  header,
}: {
  isOpen: boolean
  close?: () => void
  children: ReactElement
  onRequestClose?: () => void
  header?: ReactElement
}): ReactElement => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        overlay: {
          backgroundColor: 'rgba(0,0,0,.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        },
        content: {
          position: 'static',
          inset: 'auto',
          width: 550,
          maxWidth: 'calc(100vw - 32px)',
          padding: 0,
          background: 'var(--bg-base)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--r-1)',
          overflow: 'hidden',
          color: 'var(--text-primary)',
        },
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        {header}
        {close && (
          <button
            type="button"
            onClick={close}
            className="icon-btn"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {children}
    </Modal>
  )
}

export default DefaultModal

export type ModalProps = {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useModal = (): ModalProps => {
  const [isOpen, setIsOpen] = useState(false)
  return {
    isOpen,
    open: (): void => setIsOpen(true),
    close: (): void => setIsOpen(false),
  }
}
