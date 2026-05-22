import { ReactElement } from 'react'

const FormErrorMessage = ({
  errorMessage,
  style,
}: {
  errorMessage?: string
  style?: React.CSSProperties
}): ReactElement => {
  if (!errorMessage) return <></>

  return (
    <div
      style={{
        color: 'oklch(0.62 0.16 30)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-75)',
        letterSpacing: 0,
        wordBreak: 'break-all',
        whiteSpace: 'pre-wrap',
        paddingTop: 4,
        marginBottom: 8,
        ...style,
      }}
    >
      {errorMessage}
    </div>
  )
}

export default FormErrorMessage
