import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../utilities/cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        muted: 'border-dashed text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>;

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  ...props
}) => <span className={cn(badgeVariants({ variant }), className)} {...props} />;
