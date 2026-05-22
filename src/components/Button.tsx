import { ButtonHTMLAttributes, ReactElement } from 'react'

export type ButtonVariant = 'brand' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

const Button = ({
  className = '',
  variant = 'brand',
  size = 'lg',
  block = true,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement => {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'lg' ? 'btn--lg' : size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <button type={type} className={classes} {...rest} />
}

export default Button
