export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0c0a1d] px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-56 rounded-lg bg-white/10" />
            <div className="h-4 w-72 rounded-lg bg-white/5 mt-2" />
          </div>
          <div className="h-10 w-40 rounded-xl bg-white/10" />
        </div>
        <div className="h-44 rounded-3xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="h-8 w-40 rounded-lg bg-white/10" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
