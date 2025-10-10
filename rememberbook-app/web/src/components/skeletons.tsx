// React import kept implicit for JSX (no direct usage needed)

// Utility class string that respects reduced motion (pulse only when allowed)
const pulse = "motion-safe:animate-pulse motion-reduce:animate-none";

export function IdeaDetailSkeleton() {
  return (
    <div className={`w-full mx-auto bg-white ${pulse}`}>
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-9 h-9 rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-100" />
          <div className="w-9 h-9 rounded-full bg-gray-100" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
        </div>
        <div className="flex gap-3 mt-2">
          <div className="h-6 w-24 bg-gray-100 rounded-full" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-gray-200 mt-2" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-11/12" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IdeasListSkeleton() {
  return (
    <div className={`w-full px-4 py-4 ${pulse}`}>
      <div className="flex items-center gap-4 border-b border-black/5 pb-4 mb-3">
        <div className="w-16 h-16 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="w-24 h-9 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-0 divide-y divide-gray-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full" />
                <div className="w-6 h-6 bg-gray-200 rounded-full" />
              </div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-5/6 mb-2" />
            <div className="flex gap-4 mt-3">
              <div className="h-4 w-20 bg-gray-200 rounded-full" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InlineTextSkeleton({ width = "w-24" }: { width?: string }) {
  return <span className={`inline-block h-3 bg-gray-200 rounded ${width}`} />;
}
