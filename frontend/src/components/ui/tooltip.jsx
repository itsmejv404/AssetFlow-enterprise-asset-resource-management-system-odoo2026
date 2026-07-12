import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({ className, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content className={cn('z-50 rounded-md border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-950', className)} {...props} />
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
