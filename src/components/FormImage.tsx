import { ReactElement } from 'react'

type FormImageProps = {
  src: string
  size?: number
  style?: React.CSSProperties
}

const FormImage = ({ src, size, style }: FormImageProps): ReactElement => {
  return (
    <div
      className="inline-block bg-contain bg-center bg-no-repeat"
      style={{
        // Wrap in double quotes so inlined data URIs (which contain single
        // quotes around svg attribute values) parse as a single CSS url().
        backgroundImage: `url("${src}")`,
        height: size ? `${size}px` : '100%',
        width: size ? `${size}px` : '100%',
        ...style,
      }}
    />
  )
}

export default FormImage
