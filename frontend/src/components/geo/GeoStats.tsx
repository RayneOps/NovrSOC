export function GeoStats() {
  const stats = [
    {
      title: "Enriched IPs",
      value: "12,847",
      color: "blue",
    },
    {
      title: "Countries",
      value: "187",
      color: "blue",
    },
    {
      title: "Autonomous Systems",
      value: "3,492",
      color: "purple",
    },
    {
      title: "Cache Hit Rate",
      value: "96%",
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-5">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white rounded-xl border border-border p-5 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-foreground-muted font-semibold">
            {stat.title}
          </p>

          <h2 className="mt-3 text-3xl font-black text-foreground">
            {stat.value}
          </h2>
        </div>
      ))}
    </div>
  );
}