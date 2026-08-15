export function LoadingState() {
  return (
    <section className="result-shell" aria-busy="true" aria-label="Looking up TikTok data">
      <div className="skeleton-header">
        <div className="skeleton skeleton--avatar" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="skeleton h-7 w-52 max-w-full" />
          <div className="skeleton h-4 w-72 max-w-full" />
        </div>
        <div className="skeleton h-8 w-40" />
      </div>
      <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="bg-ink-900 p-5">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton mt-3 h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-[88%]" />
        <div className="skeleton h-4 w-[67%]" />
      </div>
    </section>
  );
}
