import { Slider as SliderPrimitive } from 'radix-ui';

import { cn } from '../../utilities/cn';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
  'aria-label': string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  onValueChange,
  'aria-label': ariaLabel,
  id,
  disabled,
  className,
}) => (
  <SliderPrimitive.Root
    id={id}
    value={[value]}
    min={min}
    max={max}
    step={1}
    disabled={disabled}
    onValueChange={([next]) => onValueChange(next)}
    className={cn(
      'relative flex h-5 w-full touch-none items-center select-none data-[disabled]:opacity-50',
      className
    )}
  >
    <SliderPrimitive.Track className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/15'>
      <SliderPrimitive.Range className='absolute h-full bg-primary' />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label={ariaLabel}
      className='block size-4 cursor-grab rounded-full border border-primary bg-background shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/50 active:cursor-grabbing'
    />
  </SliderPrimitive.Root>
);
