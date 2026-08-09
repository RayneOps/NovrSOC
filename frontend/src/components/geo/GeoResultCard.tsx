interface GeoResultCardProps {
  ip: string;
  country: string;
  region: string;
  city: string;
  latitude: string;
  longitude: string;
  asn: string;
  isp: string;
  organization: string;
  timezone: string;
  risk: "Low" | "Medium" | "High" | "Critical";
  vpn: boolean;
  proxy: boolean;
  tor: boolean;
  hosting: boolean;
  abuseScore: number;
}

function Indicator({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <span className="text-sm text-foreground-muted">{label}</span>

      <span
        className={`px-2 py-1 rounded text-xs font-bold ${
          value
            ? "bg-red-500/10 text-red-500"
            : "bg-green/10 text-green"
        }`}
      >
        {value ? "YES" : "NO"}
      </span>
    </div>
  );
}

export function GeoResultCard({
  ip,
  country,
  region,
  city,
  latitude,
  longitude,
  asn,
  isp,
  organization,
  timezone,
  risk,
  vpn,
  proxy,
  tor,
  hosting,
  abuseScore,
}: GeoResultCardProps) {
  const riskColor = {
    Low: "bg-green/10 text-green",
    Medium: "bg-amber/10 text-amber",
    High: "bg-amber/10 text-amber",
    Critical: "bg-red-500/10 text-red-500",
  }[risk];

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">

      <div className="flex items-center justify-between border-b border-border px-6 py-4">

        <div>
          <h2 className="text-xl font-black">
            Investigation Result
          </h2>

          <p className="text-foreground-muted text-sm mt-1">
            Intelligence summary for the selected target.
          </p>
        </div>

        <span className={`px-4 py-2 rounded-full text-sm font-bold ${riskColor}`}>
          {risk}
        </span>

      </div>

      <div className="grid lg:grid-cols-2 gap-8 p-6">

        <div className="space-y-3">

          <Field label="IP Address" value={ip} />
          <Field label="Country" value={country} />
          <Field label="Region" value={region} />
          <Field label="City" value={city} />
          <Field label="Latitude" value={latitude} />
          <Field label="Longitude" value={longitude} />
          <Field label="ASN" value={asn} />
          <Field label="ISP" value={isp} />
          <Field label="Organization" value={organization} />
          <Field label="Timezone" value={timezone} />

        </div>

        <div>

          <h3 className="font-bold text-foreground mb-3">
            Threat Indicators
          </h3>

          <Indicator label="VPN" value={vpn} />
          <Indicator label="Proxy" value={proxy} />
          <Indicator label="TOR" value={tor} />
          <Indicator label="Hosting" value={hosting} />

          <div className="mt-6">

            <div className="flex justify-between text-sm font-semibold">
              <span>Abuse Confidence</span>
              <span>{abuseScore}%</span>
            </div>

            <div className="mt-2 h-3 rounded-full bg-card-muted overflow-hidden">
              <div
                className="bg-red-500 h-full"
                style={{ width: `${abuseScore}%` }}
              />
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between border-b border-border py-2">

      <span className="text-foreground-muted text-sm">
        {label}
      </span>

      <span className="font-semibold text-foreground">
        {value}
      </span>

    </div>
  );
}