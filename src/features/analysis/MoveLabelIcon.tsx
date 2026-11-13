import {
  BookOpen,
  Check,
  Star,
  ThumbsUp,
  X,
  type LucideIcon,
} from 'lucide-react';

import { MoveLabel } from '../../services/classify';
import { cn } from '../../utilities/cn';

const LABEL_APPEARANCE: Record<MoveLabel, LabelAppearance> = {
  [MoveLabel.Brilliant]: {
    className: 'bg-label-brilliant text-white',
    color: 'var(--label-brilliant)',
    glyph: '!!',
  },
  [MoveLabel.Great]: {
    className: 'bg-label-great text-white',
    color: 'var(--label-great)',
    glyph: '!',
  },
  [MoveLabel.Best]: {
    className: 'bg-label-positive text-white',
    color: 'var(--label-positive)',
    icon: Star,
  },
  [MoveLabel.Excellent]: {
    className: 'bg-label-positive text-white',
    color: 'var(--label-positive)',
    icon: ThumbsUp,
  },
  [MoveLabel.Good]: {
    className: 'bg-muted-foreground text-background',
    color: 'var(--muted-foreground)',
    icon: Check,
  },
  [MoveLabel.Book]: {
    className: 'bg-muted-foreground text-background',
    color: 'var(--muted-foreground)',
    icon: BookOpen,
  },
  [MoveLabel.Inaccuracy]: {
    className: 'bg-label-inaccuracy text-label-ink',
    color: 'var(--label-inaccuracy)',
    glyph: '?!',
  },
  [MoveLabel.Mistake]: {
    className: 'bg-label-mistake text-white',
    color: 'var(--label-mistake)',
    glyph: '?',
  },
  [MoveLabel.Miss]: {
    className: 'bg-label-mistake text-white',
    color: 'var(--label-mistake)',
    icon: X,
  },
  [MoveLabel.Blunder]: {
    className: 'bg-label-blunder text-white',
    color: 'var(--label-blunder)',
    glyph: '??',
  },
};

interface LabelAppearance {
  className: string;
  color: string;
  glyph?: string;
  icon?: LucideIcon;
}

interface MoveLabelIconProps {
  label: MoveLabel;
  className?: string;
}

export const MoveLabelIcon: React.FC<MoveLabelIconProps> = ({
  label,
  className,
}) => {
  const {
    className: toneClassName,
    glyph,
    icon: Icon,
  } = LABEL_APPEARANCE[label];

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-none font-bold tracking-tighter',
        toneClassName,
        className
      )}
    >
      {Icon ? <Icon className='size-2.5' strokeWidth={3} /> : glyph}
    </span>
  );
};

export function getLabelColor(label: MoveLabel): string {
  return LABEL_APPEARANCE[label].color;
}
