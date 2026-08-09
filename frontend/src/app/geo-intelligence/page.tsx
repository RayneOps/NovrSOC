import { PageLayout } from "@/components/layout/PageLayout";

import { GeoStats } from "@/components/geo/GeoStats";
import { GeoSearch } from "@/components/geo/GeoSearch";
import { GeoResultCard } from "@/components/geo/GeoResultCard";
import { NigeriaMap } from "@/components/geo/NigeriaMap";
import { Globe3D } from "@/components/geo/Globe3D";

export default function GeoIntelligencePage() {
  return (
    <PageLayout title="Geo Intelligence">
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-foreground">
            Geo Intelligence
          </h1>

          <p className="mt-2 text-lg text-foreground-muted">
            Investigate IP addresses, monitor attack origins, analyze Nigerian cyber activity and visualize global threat intelligence.
          </p>
        </div>

        {/* Overview KPIs */}
        <GeoStats />

        {/* Search */}
        <GeoSearch />

        {/* Search Result */}
        <GeoResultCard />

        {/* ==================== NIGERIA ==================== */}

        <section className="bg-card rounded-2xl border border-border p-8">

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">
              🇳🇬 Nigerian National Threat Activity
            </h2>

            <p className="text-foreground-muted mt-2">
              Live monitoring of cyber threats, attack origins and regional intelligence across Nigeria.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-6">

            {/* Nigeria Map */}

            <div className="col-span-3 rounded-xl border border-border p-4">
              <NigeriaMap />
            </div>

            {/* KPIs */}

            <div className="col-span-2 grid grid-cols-2 gap-4">

              {[
                ["Attack Volume", "4,912"],
                ["Threat Score", "87"],
                ["High Risk States", "6"],
                ["IOC Matches", "132"],
                ["Active Campaigns", "14"],
                ["Top ASN", "AS37282"],
                ["Top ISP", "MTN"],
                ["Avg Response", "121ms"],
              ].map(([title, value]) => (
                <div
                  key={title}
                  className="rounded-xl border border-border p-5"
                >
                  <p className="text-xs uppercase tracking-wide text-foreground-muted font-semibold">
                    {title}
                  </p>

                  <h3 className="mt-3 text-2xl font-black text-foreground">
                    {value}
                  </h3>
                </div>
              ))}

            </div>

          </div>

          {/* Heatmap Legend */}

          <div className="mt-8 flex items-center gap-6">

            <span className="font-semibold">
              Threat Level
            </span>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-green"></div>
              Low
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-amber"></div>
              Medium
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-amber"></div>
              High
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-red-500"></div>
              Critical
            </div>

          </div>

          {/* Regional Cards */}

          <div className="grid grid-cols-6 gap-4 mt-8">

            {[
              "Lagos",
              "Abuja",
              "Rivers",
              "Kano",
              "Kaduna",
              "Enugu",
            ].map((state) => (

              <div
                key={state}
                className="rounded-xl border border-border p-4 text-center"
              >

                <p className="font-semibold">
                  {state}
                </p>

                <h3 className="text-2xl font-black mt-2">
                  {Math.floor(Math.random() * 500)}
                </h3>

              </div>

            ))}

          </div>

        </section>

        {/* ==================== GLOBAL ==================== */}

        <section className="bg-card rounded-2xl border border-border p-8">

          <div className="mb-8">

            <h2 className="text-3xl font-bold">
              🌍 Global Threat Intelligence
            </h2>

            <p className="text-foreground-muted mt-2">
              Continental cyber activity and worldwide attack monitoring.
            </p>

          </div>

          <Globe3D />

          <div className="grid grid-cols-6 gap-4 mt-8">

            {[
              "Africa",
              "Europe",
              "Asia",
              "North America",
              "South America",
              "Oceania",
            ].map((continent) => (

              <div
                key={continent}
                className="rounded-xl border border-border p-5 text-center hover:border-green transition cursor-pointer"
              >

                <h3 className="font-bold">
                  {continent}
                </h3>

                <p className="mt-3 text-3xl font-black">
                  {Math.floor(Math.random() * 900)}
                </p>

              </div>

            ))}

          </div>

          <div className="grid grid-cols-6 gap-4 mt-8">

            {[
              ["Countries", "187"],
              ["Top Continent", "Africa"],
              ["Threat Campaigns", "47"],
              ["Top ASN", "AS4134"],
              ["Top ISP", "China Telecom"],
              ["Threat Sources", "5"],
            ].map(([title, value]) => (

              <div
                key={title}
                className="rounded-xl border border-border p-5"
              >

                <p className="text-xs uppercase text-foreground-muted font-semibold">
                  {title}
                </p>

                <h3 className="mt-3 text-xl font-black">
                  {value}
                </h3>

              </div>

            ))}

          </div>

        </section>

        {/* Recent Lookups */}

        <section className="bg-card rounded-2xl border border-border p-8">

          <h2 className="text-2xl font-bold mb-6">
            Recent Lookups
          </h2>

          <div className="rounded-xl border border-border overflow-hidden">

            <table className="w-full">

              <thead className="bg-card-muted">

                <tr>

                  <th className="text-left p-4">IP</th>
                  <th className="text-left p-4">Country</th>
                  <th className="text-left p-4">State</th>
                  <th className="text-left p-4">ISP</th>
                  <th className="text-left p-4">Risk</th>

                </tr>

              </thead>

              <tbody>

                {[
                  ["102.89.44.2","Nigeria","Lagos","MTN","High"],
                  ["41.203.67.9","Nigeria","Abuja","Airtel","Medium"],
                  ["8.8.8.8","United States","-","Google","Low"],
                ].map((row) => (

                  <tr key={row[0]} className="border-t">

                    {row.map((cell) => (
                      <td key={cell} className="p-4">
                        {cell}
                      </td>
                    ))}

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

        {/* Export */}

        <section className="flex gap-4">

          {["Export PDF","Export CSV","Export JSON","Share"].map((button) => (

            <button
              key={button}
              className="rounded-lg bg-grey-900 text-white px-6 py-3 hover:bg-grey-900"
            >
              {button}
            </button>

          ))}

        </section>

      </div>
    </PageLayout>
  );
}