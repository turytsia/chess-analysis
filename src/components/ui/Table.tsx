import { cn } from '../../utilities/cn';

export const Table: React.FC<React.ComponentProps<'table'>> = ({
  className,
  ...props
}) => (
  <div className='w-full overflow-x-auto'>
    <table
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
);

export const TableHeader: React.FC<React.ComponentProps<'thead'>> = ({
  className,
  ...props
}) => <thead className={cn('[&_tr]:border-b', className)} {...props} />;

export const TableBody: React.FC<React.ComponentProps<'tbody'>> = ({
  className,
  ...props
}) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableRow: React.FC<React.ComponentProps<'tr'>> = ({
  className,
  ...props
}) => (
  <tr
    className={cn('border-b transition-colors hover:bg-muted/50', className)}
    {...props}
  />
);

export const TableHead: React.FC<React.ComponentProps<'th'>> = ({
  className,
  ...props
}) => (
  <th
    className={cn(
      'h-9 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground',
      className
    )}
    {...props}
  />
);

export const TableCell: React.FC<React.ComponentProps<'td'>> = ({
  className,
  ...props
}) => (
  <td
    className={cn('px-3 py-2.5 align-middle whitespace-nowrap', className)}
    {...props}
  />
);
