import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }) {
  return <TabsPrimitive.List className={cn('inline-flex h-9 items-center rounded-lg bg-violet-50 p-1 text-violet-500', className)} {...props} />
}

function TabsTrigger({ className, ...props }) {
  return <TabsPrimitive.Trigger className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-violet-950', className)} {...props} />
}

function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn('mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
