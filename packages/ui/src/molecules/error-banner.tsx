import { AlertCircle } from 'lucide-react';
import { type ReactNode } from 'react';

export interface ErrorBannerProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

export function ErrorBanner({ message, icon, className = '' }: ErrorBannerProps) {
  return (
    <div className={`flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive ${className}`}>
      {icon ?? <AlertCircle className="h-4 w-4 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}
