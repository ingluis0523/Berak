import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:    'bg-primary-100 text-primary-800',
        secondary:  'bg-gray-100 text-gray-700',
        success:    'bg-green-100 text-green-700',
        warning:    'bg-orange-100 text-orange-700',
        danger:     'bg-red-100 text-red-700',
        info:       'bg-blue-100 text-blue-700',
        purple:     'bg-purple-100 text-purple-700',
        nuevo:      'bg-blue-100 text-blue-700',
        visitante:  'bg-purple-100 text-purple-700',
        asistente:  'bg-green-100 text-green-700',
        servidor:   'bg-orange-100 text-orange-700',
        inactivo:   'bg-gray-100 text-gray-600',
        programado: 'bg-blue-100 text-blue-700',
        realizado:  'bg-green-100 text-green-700',
        cancelado:  'bg-red-100 text-red-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
