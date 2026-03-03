export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

export const TableSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 space-x-reverse px-6 py-4 border-b border-gray-50">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-20 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    ))}
  </div>
);
