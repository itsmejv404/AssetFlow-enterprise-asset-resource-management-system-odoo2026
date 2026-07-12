import { cn } from '../../lib/utils'

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(
        // Layout & shape
        'h-9 w-full rounded-md',
        // Border & background
        'border border-violet-200 bg-white',
        // Typography
        'px-3 py-1 text-sm text-violet-950',
        // Placeholder
        'placeholder:text-violet-400',
        // Transitions
        'transition-[border-color,box-shadow] duration-150 ease-out',
        // Hover
        'hover:border-violet-300',
        // Focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:border-violet-500',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-violet-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
