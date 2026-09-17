export default function CrmLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-navy-light" />
      <div className="h-4 w-72 rounded bg-navy-light" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-navy-light" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-navy-light" />
    </div>
  );
}
