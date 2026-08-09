export function ThreatGlobe() {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6">
      <h2 className="text-2xl font-black text-foreground">
        🌍 Global Threat Globe
      </h2>

      <p className="text-foreground-muted mt-1">
        Global cyber activity across continents.
      </p>

      <div className="h-[500px] mt-6 rounded-xl border bg-card-muted flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl">🌎</div>

          <p className="mt-4 font-semibold">
            Interactive Globe
          </p>

          <p className="text-sm text-foreground-muted">
            3D visualization coming next
          </p>
        </div>
      </div>
    </div>
  );
}