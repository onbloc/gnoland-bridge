import { ReactElement } from 'react'

const GnoLogo = (): ReactElement => {
  return (
    <a className="b-logo" href="/" aria-label="Gno Bridge">
      <img
        className="b-logo__img b-logo__img--light"
        src="/GnoBridge_Light.svg"
        alt="Gno Bridge"
      />
      <img
        className="b-logo__img b-logo__img--dark"
        src="/GnoBridge_dark.svg"
        alt="Gno Bridge"
      />
    </a>
  )
}

export default GnoLogo
