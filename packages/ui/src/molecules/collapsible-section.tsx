import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'compact';
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (variant === 'compact') {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ChevronRight
            className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
          {title}
        </CollapsibleTrigger>
        <CollapsibleContent className="animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
          <div className="pt-1">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors cursor-pointer">
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
        <div className="pl-6 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
