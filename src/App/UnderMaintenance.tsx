import { ReactElement, useState } from 'react'

import maintenancePng from 'images/maintenance.png'

import FormImage from 'components/FormImage'

const UnderMaintenance = (): ReactElement => {
  const [hideMaintenance, setHideMaintenance] = useState(false)
  const hide = (): void => setHideMaintenance(true)

  const isUnderMaintenance = false

  if (!isUnderMaintenance || hideMaintenance) {
    return <></>
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-5)',
      }}
    >
      <div
        className="card card--padded"
        style={{
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <FormImage size={80} src={maintenancePng} />
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--fs-600)',
            fontWeight: 500,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
          }}
        >
          Under maintenance
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--fs-200)',
            color: 'var(--text-secondary)',
          }}
        >
          We&apos;ll be back soon.
        </p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={hide}>
          Enter anyway (testing)
        </button>
      </div>
    </div>
  )
}

export default UnderMaintenance
