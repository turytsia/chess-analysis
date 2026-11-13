import { cn } from '../../utilities/cn';

export const Card: React.FC<React.ComponentProps<'div'>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-xs',
      className
    )}
    {...props}
  />
);

export const CardHeader: React.FC<React.ComponentProps<'div'>> = ({
  className,
  ...props
}) => (
  <div className={cn('flex flex-col gap-1 p-4 pb-0', className)} {...props} />
);

export const CardTitle: React.FC<React.ComponentProps<'h3'>> = ({
  className,
  ...props
}) => (
  <h3
    className={cn('text-sm leading-none font-medium', className)}
    {...props}
  />
);

export const CardDescription: React.FC<React.ComponentProps<'p'>> = ({
  className,
  ...props
}) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);

export const CardContent: React.FC<React.ComponentProps<'div'>> = ({
  className,
  ...props
}) => <div className={cn('p-4', className)} {...props} />;
