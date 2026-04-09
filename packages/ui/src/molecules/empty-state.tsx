import { type ReactNode } from 'react';

export interface EmptyStateProps {
  message: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ message, hint, icon, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      {icon && <div className="text-muted-foreground/60">{icon}</div>}
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
