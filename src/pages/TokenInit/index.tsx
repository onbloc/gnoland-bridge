import { ReactElement, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'

import PacketTracker from 'components/PacketTracker'
import routes from 'consts/routes'
import { UTIL } from 'consts'
import useTokenInit from 'hooks/useTokenInit'
import { encodeInitMetadataHex } from 'packages/union/gno-init-metadata'
import {
  GNO_DIRECT_ZKGM_ENABLED,
  GNO_INIT_DEFAULT_BASE_AMOUNT,
  GNO_INIT_DEFAULT_QUOTE_TOKEN,
  GNO_INIT_AUTHORITY_ADDRESS,
  GNO_INIT_IMPLEMENTATION_ADDRESS,
  GNO_INIT_MINTER_ADDRESS,
  GNO_INIT_RAW_OPERAND_HEX,
  GNO_INIT_TOKEN_DECIMALS,
  GNO_INIT_TOKEN_NAME,
  GNO_INIT_TOKEN_SYMBOL,
} from 'packages/union/gno-zkgm-constants'
import AuthStore from 'store/AuthStore'
import { RequestTxResultType } from 'types/send'

const findUgnotRoute = (): (typeof routes)[number] | undefined =>
  routes.find(
    (r) => r.src === 'gnoland' && r.dest === 'ethereum' && r.denom === 'ugnot'
  )

const normalizeHexField = (raw: string): `0x${string}` | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const withPrefix = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
  if (!/^0x[0-9a-fA-F]*$/.test(withPrefix)) {
    throw new Error('Override operand hex must be hex.')
  }
  if ((withPrefix.length - 2) % 2 !== 0) {
    throw new Error('Override operand hex must have an even hex length.')
  }
  return withPrefix as `0x${string}`
}

const TokenInit = (): ReactElement => {
  const ugnotRoute = useMemo(findUgnotRoute, [])
  const gnoWallet = useRecoilValue(AuthStore.gnoWallet)
  const { initToken, loading } = useTokenInit()

  // Form state. Defaults are prefilled for the ugnot wrapper so the operator
  // can fire the INITIALIZE packet without rewriting anything; every field is
  // editable so the same page handles future tokens.
  const [baseToken, setBaseToken] = useState(ugnotRoute?.baseToken || 'ugnot')
  const [baseAmount, setBaseAmount] = useState(GNO_INIT_DEFAULT_BASE_AMOUNT)
  const [quoteToken, setQuoteToken] = useState(
    GNO_INIT_DEFAULT_QUOTE_TOKEN || ugnotRoute?.quoteToken || ''
  )
  const [sourceChannel, setSourceChannel] = useState(
    ugnotRoute?.source_channel || ''
  )
  const [destChannel, setDestChannel] = useState(ugnotRoute?.dest_channel || '')
  const [tokenName, setTokenName] = useState(GNO_INIT_TOKEN_NAME)
  const [tokenSymbol, setTokenSymbol] = useState(GNO_INIT_TOKEN_SYMBOL)
  const [tokenDecimals, setTokenDecimals] = useState(GNO_INIT_TOKEN_DECIMALS)
  const [implementation, setImplementation] = useState(
    GNO_INIT_IMPLEMENTATION_ADDRESS
  )
  const [authority, setAuthority] = useState(GNO_INIT_AUTHORITY_ADDRESS)
  const [minter, setMinter] = useState(GNO_INIT_MINTER_ADDRESS)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [overrideHex, setOverrideHex] = useState('')
  const [operandHexOverride, setOperandHexOverride] = useState(
    GNO_INIT_RAW_OPERAND_HEX
  )

  const [result, setResult] = useState<RequestTxResultType | null>(null)
  const [error, setError] = useState<string>('')

  const adenaConnected = !!gnoWallet?.address

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setResult(null)

    const sourceChannelId = Number.parseInt(sourceChannel, 10)
    const destinationChannelId = Number.parseInt(destChannel, 10)
    if (!Number.isFinite(sourceChannelId) || sourceChannelId < 1) {
      setError('Source channel must be a positive integer.')
      return
    }
    if (!Number.isFinite(destinationChannelId) || destinationChannelId < 1) {
      setError('Destination channel must be a positive integer.')
      return
    }
    if (!baseToken.trim()) {
      setError('Base token denom is required.')
      return
    }
    if (!quoteToken.trim()) {
      setError('Quote token (predicted wrapper address) is required.')
      return
    }
    if (!/^[0-9]+$/.test(baseAmount.trim())) {
      setError('Base amount must be a positive integer in base units.')
      return
    }
    const amount = BigInt(baseAmount.trim())
    if (amount <= 0n) {
      setError('Base amount must be greater than zero.')
      return
    }

    let metadataHex: `0x${string}` = '0x'
    let normalizedOperandOverride: `0x${string}` | undefined
    try {
      normalizedOperandOverride = normalizeHexField(operandHexOverride)
      if (!normalizedOperandOverride) {
        metadataHex = encodeInitMetadataHex({
          implementation,
          authority,
          minter,
          name: tokenName,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          overrideHex: overrideHex.trim() || undefined,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }

    const res = await initToken({
      baseToken: baseToken.trim(),
      amount,
      quoteToken: quoteToken.trim(),
      metadataHex,
      operandHexOverride: normalizedOperandOverride,
      sourceChannelId,
      destinationChannelId,
      receiver: authority.trim() || undefined,
    })

    setResult(res)
    if (!res.success) {
      setError(res.errorMessage || 'INITIALIZE failed')
    }
  }

  if (!GNO_DIRECT_ZKGM_ENABLED) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="bridge-card">
          <div className="bridge-card__head">
            <div>
              <div className="bridge-card__title">Token Init</div>
              <div className="card__sub">
                Set <span className="mono">VITE_GNO_DIRECT_ZKGM=true</span> to
                enable this page.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const success = result?.success === true

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="bridge-card">
        <div className="bridge-card__head">
          <div>
            <div className="bridge-card__title">Token Init</div>
            <div className="card__sub">
              One-shot INITIALIZE packet that asks the EVM ZKGM to
              CREATE2-deploy the wrapped ERC20 for a Gno-side token.
            </div>
          </div>
          <span className={`tag${adenaConnected ? ' tag--success' : ''}`}>
            <span className="dot" />
            {adenaConnected ? 'Adena ready' : 'Adena not connected'}
          </span>
        </div>

        <form
          className="bridge-card__body"
          onSubmit={onSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <Field label="From" value="gnoland" readOnly />
            <Field label="To" value="ethereum (Sepolia)" readOnly />
            <Field
              label="Base token (Gno denom)"
              value={baseToken}
              onChange={setBaseToken}
            />
            <Field
              label="Base amount"
              value={baseAmount}
              onChange={setBaseAmount}
              mono
            />
            <Field
              label="Quote token (predicted CREATE2 address)"
              value={quoteToken}
              onChange={setQuoteToken}
              mono
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-3)',
              }}
            >
              <Field
                label="Source channel ID"
                value={sourceChannel}
                onChange={setSourceChannel}
              />
              <Field
                label="Dest channel ID"
                value={destChannel}
                onChange={setDestChannel}
              />
            </div>
          </section>

          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 'var(--fs-100)',
                color: 'var(--text-secondary)',
              }}
            >
              Wrapped ERC20 metadata
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 'var(--space-3)',
              }}
            >
              <Field label="Name" value={tokenName} onChange={setTokenName} />
              <Field
                label="Symbol"
                value={tokenSymbol}
                onChange={setTokenSymbol}
              />
              <Field
                label="Decimals"
                value={String(tokenDecimals)}
                onChange={(v) =>
                  setTokenDecimals(Number.parseInt(v || '0', 10))
                }
              />
            </div>
            <Field
              label="Implementation address"
              value={implementation}
              onChange={setImplementation}
              mono
              placeholder="0x000…"
            />
            <Field
              label="Authority address"
              value={authority}
              onChange={setAuthority}
              mono
              placeholder="0x000…"
            />
            <Field
              label="Minter address"
              value={minter}
              onChange={setMinter}
              mono
              placeholder="0x000…"
            />
          </section>

          <details
            open={advancedOpen}
            onToggle={(e) =>
              setAdvancedOpen((e.target as HTMLDetailsElement).open)
            }
          >
            <summary
              style={{
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 'var(--fs-100)',
                padding: 'var(--space-2) 0',
              }}
            >
              Advanced: raw operand and metadata hex
            </summary>
            <Field
              label="Override operand hex"
              value={operandHexOverride}
              onChange={setOperandHexOverride}
              mono
              placeholder="0x... (overrides the generated TokenOrderV2 operand)"
              textarea
            />
            <Field
              label="Override metadata hex"
              value={overrideHex}
              onChange={setOverrideHex}
              mono
              placeholder="0x… (overrides the encoded TokenMetadata)"
              textarea
            />
          </details>

          {error && (
            <div
              style={{
                color: 'oklch(0.62 0.16 30)',
                fontSize: 'var(--fs-100)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || !adenaConnected}
          >
            {loading ? 'Submitting…' : 'Initialize Token'}
          </button>
        </form>

        {success && result && (
          <div
            className="bridge-card__body"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="summary" style={{ border: 0, padding: 0 }}>
              <div className="summary__row">
                <span className="summary__k">Status</span>
                <span className="summary__v">INITIALIZE submitted</span>
              </div>
              <div className="summary__row">
                <span className="summary__k">Source Tx</span>
                <span
                  className="summary__v mono"
                  style={{ fontSize: 'var(--fs-50)' }}
                >
                  {result.hash ? UTIL.truncate(result.hash, [10, 6]) : '-'}
                </span>
              </div>
              {result.packetHash && (
                <div className="summary__row">
                  <span className="summary__k">Packet</span>
                  <a
                    className="summary__v text-link"
                    href={`https://app.union.build/explorer/transfers/${result.packetHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 'var(--fs-50)' }}
                  >
                    {UTIL.truncate(result.packetHash, [10, 6])} ↗
                  </a>
                </div>
              )}
            </div>
            {result.packetHash && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <PacketTracker packetHash={result.packetHash} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  mono?: boolean
  placeholder?: string
  textarea?: boolean
}

const Field = ({
  label,
  value,
  onChange,
  readOnly,
  mono,
  placeholder,
  textarea,
}: FieldProps): ReactElement => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-2)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 'var(--fs-100)',
    fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
  }
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}
    >
      <span
        style={{ fontSize: 'var(--fs-50)', color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly || !onChange}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly || !onChange}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </label>
  )
}

export default TokenInit
