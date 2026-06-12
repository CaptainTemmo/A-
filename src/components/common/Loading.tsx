import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <Loader2 className={`animate-spin text-accent ${sizeStyles[size]} ${className}`} />
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/5 ${className}`}
    />
  );
}

interface LoadingOverlayProps {
  children?: ReactNode;
}

export function LoadingOverlay({ children }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-primary/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {children && <p className="text-gray-400 text-sm">{children}</p>}
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  rows?: number;
}

export function CardSkeleton({ rows = 3 }: CardSkeletonProps) {
  return (
    <div className="bg-primary/60 rounded-2xl p-5 border border-white/10 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}
