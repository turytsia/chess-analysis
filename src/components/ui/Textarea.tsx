import { cn } from '../../utilities/cn';

export const Textarea: React.FC<React.ComponentProps<'textarea'>> = ({
  className,
  ...props
}) => (
  <textarea
    className={cn(
      'flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
      'placeholder:text-muted-foreground dark:bg-input/30',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
);
