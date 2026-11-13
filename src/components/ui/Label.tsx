import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '../../utilities/cn';

export const Label: React.FC<
  React.ComponentProps<typeof LabelPrimitive.Root>
> = ({ className, ...props }) => (
  <LabelPrimitive.Root
    className={cn(
      'flex items-center gap-2 text-sm leading-none font-medium select-none',
      className
    )}
    {...props}
  />
);
