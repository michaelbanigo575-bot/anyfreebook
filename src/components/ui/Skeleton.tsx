/** Reusable pulse-block placeholder — pass sizing/shape via className, e.g. `<Skeleton className="h-40 rounded-2xl" />`. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--surface-hover)] ${className}`} />;
}
