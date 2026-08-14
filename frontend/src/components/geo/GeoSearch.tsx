'use client';

import { Search } from "lucide-react";

export function GeoSearch() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-black text-foreground">
          Geo Search
        </h2>

        <p className="text-sm text-foreground-muted mt-1">
          Search an IP address, domain or ASN for geolocation intelligence.
        </p>
      </div>

      <div className="p-6 space-y-6">

        <div className="flex gap-3">
          <input
            placeholder="Search IP, Domain or ASN..."
            className="flex-1 rounded-lg border border-border px-4 py-3 outline-none focus:ring-2 focus:ring-blue"
          />

          <button className="flex items-center gap-2 bg-grey-100 hover:bg-grey-100 text-white px-5 rounded-lg font-semibold">
            <Search size={18} />
            Search
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">

          <Info title="Country" value="-" />
          <Info title="Region" value="-" />
          <Info title="City" value="-" />
          <Info title="Timezone" value="-" />

          <Info title="Latitude" value="-" />
          <Info title="Longitude" value="-" />
          <Info title="ASN" value="-" />
          <Info title="Organization" value="-" />

          <Info title="ISP" value="-" />
          <Info title="Threat Score" value="-" />
          <Info title="Hosting" value="-" />
          <Info title="Proxy / VPN" value="-" />

        </div>

      </div>
    </div>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs uppercase text-foreground-muted font-semibold">
        {title}
      </p>

      <p className="mt-2 text-lg font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}