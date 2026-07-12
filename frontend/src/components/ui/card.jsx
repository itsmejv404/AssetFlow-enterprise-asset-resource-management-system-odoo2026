import { cn } from '../../lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-violet-100 bg-white text-violet-950',
        'shadow-[0_1px_3px_0_rgb(0_0_0/0.06),0_1px_2px_-1px_rgb(0_0_0/0.04)]',
        'transition-shadow duration-200',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('grid gap-1.5 p-5 pb-3', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn(
        'text-base font-semibold leading-snug tracking-tight text-violet-950',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm leading-relaxed text-violet-500', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-5 pt-0 border-t border-violet-100 mt-1',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
