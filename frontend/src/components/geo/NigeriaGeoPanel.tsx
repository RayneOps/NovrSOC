'use client';

import {
  MapPinned,
  RadioTower,
  Building2,
  Activity,
} from "lucide-react";

const topStates = [
  { state: "Lagos", threats: 214 },
  { state: "FCT Abuja", threats: 173 },
  { state: "Kano", threats: 126 },
  { state: "Rivers", threats: 102 },
  { state: "Kaduna", threats: 91 },
];

const topISPs = [
  "MTN Nigeria",
  "Airtel Nigeria",
  "Globacom",
  "9mobile",
  "MainOne",
];

const topASNs = [
  "AS37282",
  "AS29465",
  "AS36994",
  "AS328309",
  "AS328126",
];

const recentThreats = [
  {
    ip: "102.89.34.22",
    state: "Lagos",
    severity: "High",
  },
  {
    ip: "197.210.45.87",
    state: "Abuja",
    severity: "Medium",
  },
  {
    ip: "41.190.12.99",
    state: "Kano",
    severity: "Critical",
  },
];

export function NigeriaGeoPanel() {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">

      <div className="border-b border-border px-6 py-4">

        <h2 className="text-2xl font-black flex items-center gap-2">
          🇳🇬 Nigeria National Intelligence
        </h2>

        <p className="text-foreground-muted mt-1">
          Regional cyber activity across Nigerian infrastructure.
        </p>

      </div>

      <div className="p-6 grid lg:grid-cols-2 gap-6">

        <div className="rounded-xl border border-border p-6">

          <div className="flex items-center gap-2 mb-4">
            <MapPinned size={20} />
            <h3 className="font-bold">
              Nigeria Threat Map
            </h3>
          </div>

          <div className="h-72 rounded-lg bg-card-muted flex items-center justify-center text-foreground-muted">
            Nigeria Interactive Map
          </div>

        </div>

        <div className="space-y-6">

          <Widget
            title="Top States"
            icon={<Activity size={18} />}
          >
            {topStates.map((item) => (
              <Row
                key={item.state}
                left={item.state}
                right={`${item.threats} threats`}
              />
            ))}
          </Widget>

          <Widget
            title="Top ISPs"
            icon={<RadioTower size={18} />}
          >
            {topISPs.map((isp) => (
              <Row
                key={isp}
                left={isp}
                right="Active"
              />
            ))}
          </Widget>

          <Widget
            title="Top Nigerian ASNs"
            icon={<Building2 size={18} />}
          >
            {topASNs.map((asn) => (
              <Row
                key={asn}
                left={asn}
                right="Observed"
              />
            ))}
          </Widget>

        </div>

      </div>

      <div className="border-t border-border p-6">

        <h3 className="font-bold mb-4">
          Recent Nigerian Threat Activity
        </h3>

        <table className="w-full text-sm">

          <thead>

            <tr className="text-left text-foreground-muted">

              <th className="pb-3">IP</th>
              <th>State</th>
              <th>Severity</th>

            </tr>

          </thead>

          <tbody>

            {recentThreats.map((threat) => (

              <tr
                key={threat.ip}
                className="border-t border-border"
              >
                <td className="py-3 font-medium">{threat.ip}</td>

                <td>{threat.state}</td>

                <td>

                  <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
                    {threat.severity}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

function Widget({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl border-border p-4">

      <div className="flex items-center gap-2 mb-3 font-bold">
        {icon}
        {title}
      </div>

      <div className="space-y-2">
        {children}
      </div>

    </div>
  );
}

function Row({
  left,
  right,
}: {
  left: string;
  right: string;
}) {
  return (
    <div className="flex justify-between border-b border-border pb-2">

      <span>{left}</span>

      <span className="text-foreground-muted">
        {right}
      </span>

    </div>
  );
}