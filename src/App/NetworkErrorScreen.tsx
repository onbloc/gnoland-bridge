import { ReactElement, useEffect, useState } from 'react'

import Button from 'components/Button'

import { ExclamationCircle } from 'components/icons'

const NetworkErrorScreen = (): ReactElement => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine)
  const [showError, setShowError] = useState(false)
  const [title, setTitle] = useState<string>('')
  const [content, setContent] = useState<string>()

  const onOffline = (): void => {
    setIsOnline(false)
    setShowError(true)
    setTitle('No internet connection')
    setContent('Please check your internet connection and try again.')
  }

  const onOnline = (): void => {
    setIsOnline(true)
    setShowError(false)
  }

  useEffect(() => {
    if (!isOnline) {
      onOffline()
    }
  }, [isOnline])

  useEffect(() => {
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return (): void => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!showError) return <></>

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        padding: 'var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="card card--padded"
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ color: 'oklch(0.62 0.16 30)' }}>
          <ExclamationCircle style={{ fontSize: 32 }} />
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--fs-500)',
            fontWeight: 500,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--fs-100)',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </p>
        {isOnline && (
          <Button onClick={(): void => window.location.reload()}>
            Refresh
          </Button>
        )}
      </div>
    </div>
  )
}

export default NetworkErrorScreen
