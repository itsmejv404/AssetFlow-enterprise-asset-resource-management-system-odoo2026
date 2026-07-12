import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors duration-150',
  {
    variants: {
      variant: {
        // Default — violet primary
        default:
          'border-transparent bg-violet-700 text-white',

        // Secondary — soft violet
        secondary:
          'border-violet-200 bg-violet-50 text-violet-700',

        // Outline — minimal
        outline:
          'border-violet-300 bg-transparent text-violet-700',

        // Success — emerald
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700',

        // Warning — amber
        warning:
          'border-amber-200 bg-amber-50 text-amber-700',

        // Destructive — rose (matches button destructive)
        destructive:
          'border-rose-200 bg-rose-50 text-rose-700',

        // Info — blue
        info:
          'border-blue-200 bg-blue-50 text-blue-700',

        // Neutral / muted
        muted:
          'border-transparent bg-gray-100 text-gray-600',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

/**
 * Returns the appropriate badge variant for common entity status values.
 * Usage: <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
 */
function statusVariant(status) {
  const map = {
    // asset statuses
    available: 'success',
    allocated: 'info',
    under_maintenance: 'warning',
    retired: 'muted',
    disposed: 'muted',

    // request / cycle statuses
    pending: 'warning',
    approved: 'success',
    rejected: 'destructive',
    requested: 'info',
    in_progress: 'info',
    completed: 'success',
    closed: 'muted',

    // booking statuses
    upcoming: 'info',
    cancelled: 'muted',

    // generic
    active: 'success',
    inactive: 'muted',
    low: 'success',
    medium: 'warning',
    high: 'destructive',
  }
  return map[status?.toLowerCase?.()] ?? 'secondary'
}

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants, statusVariant }
