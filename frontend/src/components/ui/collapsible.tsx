import * as React from 'react'
import { Collapsible } from 'radix-ui'
import { cn } from '@/lib/utils'

const CollapsibleRoot = Collapsible.Root
const CollapsibleTrigger = Collapsible.Trigger

const CollapsibleContent = React.forwardRef<
  React.ComponentRef<typeof Collapsible.Content>,
  React.ComponentPropsWithoutRef<typeof Collapsible.Content>
>(({ className, ...props }, ref) => (
  <Collapsible.Content ref={ref} className={cn('overflow-hidden data-[state=closed]:hidden', className)} {...props} />
))
CollapsibleContent.displayName = 'CollapsibleContent'

export { CollapsibleRoot as Collapsible, CollapsibleTrigger, CollapsibleContent }
