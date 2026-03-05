import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        // clause-type colors
        indemnity: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
        termination: 'border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
        liability: 'border-transparent bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
        payment_terms: 'border-transparent bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
        jurisdiction: 'border-transparent bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
        amendment: 'border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
        definitions: 'border-transparent bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
        penalties: 'border-transparent bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
