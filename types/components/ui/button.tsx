'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary-700 text-white shadow-sm hover:bg-primary-800 active:scale-95',
        secondary:
          'bg-primary-100 text-primary-800 hover:bg-primary-200 active:scale-95',
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:scale-95',
        ghost:
          'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95',
        danger:
          'bg-red-600 text-white hover:bg-red-700 active:scale-95',
        'danger-outline':
          'border border-red-300 text-red-600 hover:bg-red-50 active:scale-95',
        success:
          'bg-green-600 text-white hover:bg-green-700 active:scale-95',
        accent:
          'bg-accent-500 text-white hover:bg-accent-600 active:scale-95',
      },
      size: {
        sm:   'h-8 px-3 text-xs',
        md:   'h-9 px-4',
        lg:   'h-11 px-6 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
