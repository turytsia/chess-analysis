import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '../../utilities/cn';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onValueChange: (value: T) => void;
  'aria-label': string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const Select = <T extends string>({
  value,
  options,
  onValueChange,
  'aria-label': ariaLabel,
  id,
  className,
  disabled,
}: SelectProps<T>): React.ReactElement => (
  <SelectPrimitive.Root
    value={value}
    onValueChange={(next) => {
      const selected = options.find((option) => option.value === next);
      selected && onValueChange(selected.value);
    }}
    disabled={disabled}
  >
    <SelectPrimitive.Trigger
      id={id}
      aria-label={ariaLabel}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm whitespace-nowrap shadow-xs outline-none dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon asChild>
        <ChevronDown className='size-4 text-muted-foreground' />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position='popper'
        sideOffset={4}
        className='z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md'
      >
        <SelectPrimitive.Viewport>
          {options.map((option) => (
            <SelectPrimitive.Item
              key={option.value}
              value={option.value}
              className='relative flex cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'
            >
              <SelectPrimitive.ItemText>
                {option.label}
              </SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className='absolute right-2 flex items-center'>
                <Check className='size-4' />
              </SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);
