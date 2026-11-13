import { Progress as ProgressPrimitive } from 'radix-ui';

import { cn } from '../../utilities/cn';

interface ProgressProps {
  value: number;
  max: number;
  'aria-label': string;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max,
  'aria-label': ariaLabel,
  className,
}) => {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <ProgressPrimitive.Root
      value={Math.min(value, max)}
      max={Math.max(max, 1)}
      aria-label={ariaLabel}
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-full bg-primary/15',
        className
      )}
    >
      <ProgressPrimitive.Indicator
        className='h-full rounded-full bg-primary transition-[width] duration-300'
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  );
};
