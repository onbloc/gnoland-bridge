import { HTMLAttributes, forwardRef } from 'react'

const Text = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col text-bridge-white ${className}`}
        {...props}
      />
    )
  }
)

Text.displayName = 'Text'

export default Text
