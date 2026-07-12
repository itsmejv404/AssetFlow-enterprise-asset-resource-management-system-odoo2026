import { cn } from '../../lib/utils'

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn('min-h-24 w-full rounded-md border border-violet-300 bg-white px-3 py-2 text-sm text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    />
  )
}

export { Textarea }
