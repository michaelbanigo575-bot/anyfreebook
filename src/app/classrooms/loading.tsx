import { Skeleton } from '@/components/ui/Skeleton';

export default function ClassroomsLoading() {
  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );
}
