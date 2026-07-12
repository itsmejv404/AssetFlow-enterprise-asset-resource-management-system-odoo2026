import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  // Base styles — all variants share these
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md border text-sm font-medium leading-none',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary action — rich violet
        default: [
          'border-violet-700 bg-violet-700 text-white',
          'hover:bg-violet-800 hover:border-violet-800',
          'focus-visible:ring-violet-600',
          'shadow-[0_1px_2px_0_rgb(0_0_0/0.1)]',
          'hover:shadow-[0_4px_12px_0_rgb(109_40_217/0.22)]',
        ].join(' '),

        // Secondary action
        secondary: [
          'border-violet-200 bg-violet-50 text-violet-900',
          'hover:bg-violet-100 hover:border-violet-300',
          'focus-visible:ring-violet-500',
        ].join(' '),

        // Outlined / tertiary
        outline: [
          'border-violet-200 bg-white text-violet-900',
          'hover:bg-violet-50 hover:border-violet-300',
          'focus-visible:ring-violet-500',
        ].join(' '),

        // Ghost — no border or background until hovered
        ghost: [
          'border-transparent bg-transparent text-violet-900',
          'hover:bg-violet-50 hover:border-violet-100',
          'focus-visible:ring-violet-500',
        ].join(' '),

        // Destructive — rose/fuchsia (violet-adjacent but distinct danger signal)
        destructive: [
          'border-rose-800 bg-rose-800 text-white',
          'hover:bg-rose-900 hover:border-rose-900',
          'focus-visible:ring-rose-600',
          'shadow-[0_1px_2px_0_rgb(0_0_0/0.1)]',
          'hover:shadow-[0_4px_12px_0_rgb(157_23_77/0.2)]',
        ].join(' '),

        // Destructive outline — for less prominent danger actions
        'destructive-outline': [
          'border-rose-300 bg-white text-rose-800',
          'hover:bg-rose-50 hover:border-rose-400',
          'focus-visible:ring-rose-500',
        ].join(' '),
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-2.5 text-xs rounded',
        md: 'h-8 px-3 text-xs',
        lg: 'h-10 px-5 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
