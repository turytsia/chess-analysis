import { Tooltip as TooltipPrimitive } from 'radix-ui';

const SHOW_DELAY_MS = 200;

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const TooltipProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => (
  <TooltipPrimitive.Provider delayDuration={SHOW_DELAY_MS}>
    {children}
  </TooltipPrimitive.Provider>
);

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={6}
        className='z-50 max-w-64 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground'
      >
        {content}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);
