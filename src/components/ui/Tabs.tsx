import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '../../utilities/cn';

export const Tabs: React.FC<
  React.ComponentProps<typeof TabsPrimitive.Root>
> = ({ className, ...props }) => (
  <TabsPrimitive.Root
    className={cn('flex flex-col gap-4', className)}
    {...props}
  />
);

export const TabsList: React.FC<
  React.ComponentProps<typeof TabsPrimitive.List>
> = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex h-9 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground',
      className
    )}
    {...props}
  />
);

export const TabsTrigger: React.FC<
  React.ComponentProps<typeof TabsPrimitive.Trigger>
> = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      'inline-flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none',
      'focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs dark:data-[state=active]:bg-input/50',
      "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  />
);

export const TabsContent: React.FC<
  React.ComponentProps<typeof TabsPrimitive.Content>
> = ({ className, ...props }) => (
  <TabsPrimitive.Content
    className={cn('flex-1 outline-none', className)}
    {...props}
  />
);
