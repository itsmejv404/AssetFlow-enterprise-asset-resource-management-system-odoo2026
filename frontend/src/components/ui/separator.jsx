import { cn } from '../../lib/utils'

function Separator({ className, orientation = 'horizontal', ...props }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(orientation === 'vertical' ? 'h-full w-px bg-violet-200' : 'h-px w-full bg-violet-200', className)}
      {...props}
    />
  )
}

export { Separator }
