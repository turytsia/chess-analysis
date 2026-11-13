import { cn } from '../../utilities/cn';

export const Input: React.FC<React.ComponentProps<'input'>> = ({
  className,
  type = 'text',
  ...props
}) => (
  <input
    type={type}
    className={cn(
      'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
      'placeholder:text-muted-foreground dark:bg-input/30',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
);
