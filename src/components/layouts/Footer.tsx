import { ReactElement } from 'react'

import GnoLogo from 'components/GnoLogo'

const Footer = (): ReactElement => {
  return (
    <footer className="b-footer">
      <div className="b-footer__inner">
        <div style={{ maxWidth: 320 }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <GnoLogo />
          </div>
          <p
            style={{
              fontSize: 'var(--fs-100)',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            gno.land bridge is permissionless and non-custodial. This is a
            community project. Use at your own risk.
          </p>
        </div>
        <div className="b-footer__cols">
          <div className="b-footer__col">
            <h4>Build</h4>
            <ul>
              <li>
                <a
                  href="https://docs.gno.land"
                  target="_blank"
                  rel="noreferrer"
                >
                  Docs
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/gnolang/gno"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
          <div className="b-footer__col">
            <h4>Network</h4>
            <ul>
              <li>
                <a href="https://gnoscan.io" target="_blank" rel="noreferrer">
                  Explorer
                </a>
              </li>
              <li>
                <a
                  href="https://faucet.gno.land"
                  target="_blank"
                  rel="noreferrer"
                >
                  Faucet
                </a>
              </li>
            </ul>
          </div>
          <div className="b-footer__col">
            <h4>Community</h4>
            <ul>
              <li>
                <a
                  href="https://discord.gg/YFtMjWwUN7"
                  target="_blank"
                  rel="noreferrer"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/_gnoland"
                  target="_blank"
                  rel="noreferrer"
                >
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
