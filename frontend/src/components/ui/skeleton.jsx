import { cn } from '../../lib/utils'

function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-violet-100', className)} {...props} />
}

export { Skeleton }
