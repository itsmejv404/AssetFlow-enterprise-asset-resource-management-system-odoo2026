import { cn } from '../../lib/utils'

function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }) {
  return <tr className={cn('border-b transition-colors hover:bg-violet-50', className)} {...props} />
}

function TableHead({ className, ...props }) {
  return <th className={cn('h-10 px-4 text-left align-middle text-xs font-medium uppercase text-violet-500', className)} {...props} />
}

function TableCell({ className, ...props }) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
