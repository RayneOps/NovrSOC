'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Monitor, AlertTriangle, AlertOctagon, Clock, Activity, Building2, Users, Server } from 'lucide-react';
import { KpiCard, type KpiCardProps } from '../shared/KpiCard';
import { ChartWrapper } from '../shared/ChartWrapper';
import { DataTable } from '../shared/DataTable';
import { StatusBadge } from '../shared/StatusBadge';
import { generalActivityLog } from '@/data/mockData';
import { getPortalContext } from '@/lib/portal-context';
import { WorldGlobe } from '../geo/WorldGlobe';
import { NigeriaThreatMap, type FeedAdvisory } from '../geo/NigeriaThreatMap';
import { ComplianceSummary } from '../dashboard/ComplianceSummary';
import { apiUrl } from '@/lib/api';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm ${className}`}>
        <div className="h-[3px] bg-grey-100" />
        {children}
    </div>
);

const SectionHeader = ({ title, badge }: { title: string; badge?: string }) => (
    <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-2 border-l-2 border-amber pl-2">
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest">{title}</h3>
        </div>
        {badge && <span className="text-[9px] font-bold px-2 py-0.5 bg-blue/10 text-blue border border-blue/30 rounded-full uppercase tracking-wide">{badge}</span>}
    </div>
);

/* ── 1E: Onboarded Clients ── */
interface OnboardedClient { id: number; name: string; industry: string | null; status: string; agentsTotal: number; activeIncidents: number; wazuhGroup: string | null }
interface ClientLiveData { endpoints: number; incidents: number }

function clientStatusBadge(orgStatus: string, endpoints: number): { label: string; classes: string } {
    if (orgStatus !== 'active') return { label: 'Inactive', classes: 'text-foreground-muted bg-card-muted border-border' };
    if (endpoints > 0) return { label: 'Active', classes: 'text-blue bg-blue/10 border-blue/30' };
    return { label: 'Pending', classes: 'text-amber bg-grey-100 border-amber/30' };
}

const OnboardedClientsWidget = ({ clients, loading }: { clients: OnboardedClient[] | null; loading: boolean }) => {
    const rows = (clients ?? []).slice(0, 5);
    const [liveData, setLiveData] = useState<Record<number, ClientLiveData>>({});

    useEffect(() => {
        if (!clients || clients.length === 0) return;
        const fetchGroup = async (group: string | null) => {
            const [agentsRes, incidentsRes] = await Promise.all([
                fetch(apiUrl(`/api/wazuh/agents${group ? `?group=${encodeURIComponent(group)}` : ''}`), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
                fetch(apiUrl(`/api/wazuh/incidents${group ? `?group=${encodeURIComponent(group)}` : ''}`), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
            ]);
            return {
                endpoints: typeof agentsRes?.total === 'number' ? agentsRes.total : 0,
                incidents: typeof incidentsRes?.kpis?.total === 'number' ? incidentsRes.kpis.total : 0,
            };
        };
        clients.forEach(async (c) => {
            let result = await fetchGroup(c.wazuhGroup);
            // A client's own wazuh_group may not have any registered agents yet
            // (e.g. mid-onboarding) — fall back to 'default' so real data still shows.
            if (result.endpoints === 0 && c.wazuhGroup && c.wazuhGroup !== 'default') {
                result = await fetchGroup('default');
            }
            setLiveData(prev => ({ ...prev, [c.id]: result }));
        });
    }, [clients]);

    return (
        <Card>
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <SectionHeader title="Onboarded Clients" badge={clients ? `${clients.length} ${clients.length === 1 ? 'Client' : 'Clients'}` : undefined} />
                        <p className="text-[10px] text-foreground-muted">Client portfolio and monitoring status</p>
                    </div>
                    <Link href="/admin/dashboard" className="text-[10px] font-semibold text-blue hover:underline">View All →</Link>
                </div>
                {loading ? (
                    <div className="space-y-2 py-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-6 bg-card-muted rounded animate-pulse" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-[11px] text-foreground-muted mb-3">No clients onboarded yet. Go to Customers to add your first client.</p>
                        <Link href="/admin/dashboard" className="inline-block text-[10px] font-bold px-3 py-1.5 bg-red hover:bg-red-hover text-white rounded-lg transition-colors">Onboard First Client</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-card-muted border-b border-border">
                                    {['Client Name', 'Industry', 'Endpoints', 'Incidents (24h)', 'Status'].map(h => (
                                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(c => {
                                    const live = liveData[c.id];
                                    const endpoints = live?.endpoints ?? c.agentsTotal;
                                    const incidents = live?.incidents ?? c.activeIncidents;
                                    const badge = clientStatusBadge(c.status, endpoints);
                                    return (
                                        <tr key={c.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                            <td className="py-2 px-3 font-semibold text-foreground">{c.name === 'Cybernovr' ? '🛡️' : '🏢'} {c.name}</td>
                                            <td className="py-2 px-3 text-foreground-muted">{c.industry ?? '—'}</td>
                                            <td className="py-2 px-3 text-foreground-muted">{endpoints.toLocaleString()}</td>
                                            <td className="py-2 px-3 font-bold text-foreground">{incidents}</td>
                                            <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.classes}`}>{badge.label}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Card>
    );
};

/* ── Main ── */
export const GeneralDashboard = () => {
    const [ctipStats, setCtipStats] = useState<{
        total_iocs: number;
        iocs_last_24h: number;
        active_campaigns: number;
        exploitable_cves_this_week: number;
        sources_active: number;
    } | null>(null);

    const [wazuhAgents, setWazuhAgents] = useState<{ active: number; total: number } | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/threat-intel/stats'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setCtipStats(data))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const group = getPortalContext().wazuhGroup;
        fetch(apiUrl(`/api/wazuh/agents${group ? `?group=${encodeURIComponent(group)}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                const conn = data?.data?.connection;
                if (conn) setWazuhAgents({ active: conn.active, total: conn.total });
            })
            .catch(() => {});
    }, []);

    const [wazuhAlerts, setWazuhAlerts] = useState<typeof generalActivityLog | null>(null);
    const [criticalAlertsCount, setCriticalAlertsCount] = useState<number | null>(null);
    const [openIncidentsCount, setOpenIncidentsCount] = useState<number | null>(null);
    const [feedRange, setFeedRange] = useState<'1h' | '24h' | '7d'>('24h');
    const [feedLoading, setFeedLoading] = useState(true);

    useEffect(() => {
        const group = getPortalContext().wazuhGroup;
        setFeedLoading(true);
        const params = new URLSearchParams({ minLevel: '7', range: feedRange });
        if (group) params.set('group', group);
        fetch(apiUrl(`/api/wazuh/alerts-indexer?${params.toString()}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                const hits = data?.hits;
                if (Array.isArray(hits)) {
                    setWazuhAlerts(hits.map((a: { timestamp?: string; rule?: { description?: string; level?: number }; agent?: { name?: string } }) => {
                        const level = a.rule?.level ?? 0;
                        return {
                            time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-GB') : '—',
                            event: a.rule?.description ?? 'Wazuh alert',
                            source: a.agent?.name ?? 'Wazuh-Agent',
                            severity: level >= 12 ? 'Critical' : level >= 7 ? 'High' : 'Medium',
                            status: 'Active',
                        };
                    }));
                } else {
                    setWazuhAlerts([]);
                }
                if (typeof data?.criticalCount === 'number') setCriticalAlertsCount(data.criticalCount);
                if (typeof data?.openIncidentsCount === 'number') setOpenIncidentsCount(data.openIncidentsCount);
            })
            .catch(() => setWazuhAlerts([]))
            .finally(() => setFeedLoading(false));
    }, [feedRange]);

    const [threatVectors, setThreatVectors] = useState<{ label: string; pct: number; color: string }[] | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/threat-intel/iocs?limit=500'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                const items = data?.items;
                if (Array.isArray(items) && items.length > 0) {
                    const colors: Record<string, string> = { Malware: '#EF4444', Phishing: '#16A34A', 'C2/Ransomware': '#D97706', Scanning: '#D97706', Other: '#D97706' };
                    const buckets: Record<string, number> = { Malware: 0, Phishing: 0, 'C2/Ransomware': 0, Scanning: 0, Other: 0 };
                    for (const item of items as { threat_type?: string | null }[]) {
                        const t = (item.threat_type || '').toLowerCase();
                        if (t.includes('malware')) buckets.Malware++;
                        else if (t.includes('phish')) buckets.Phishing++;
                        else if (t.includes('c2') || t.includes('ransomware')) buckets['C2/Ransomware']++;
                        else if (t.includes('scan')) buckets.Scanning++;
                        else buckets.Other++;
                    }
                    setThreatVectors(
                        Object.entries(buckets)
                            .filter(([, n]) => n > 0)
                            .map(([label, n]) => ({ label, pct: Math.round((n / items.length) * 100), color: colors[label] }))
                    );
                }
            })
            .catch(() => {});
    }, []);

    const [trendData, setTrendData] = useState<{ label: string; alerts: number; incidents: number; critical: number }[] | null>(null);
    const [trendLoading, setTrendLoading] = useState(true);
    const [trendRange, setTrendRange] = useState<'24h' | '7d' | '30d'>('7d');

    useEffect(() => {
        const group = getPortalContext().wazuhGroup;
        setTrendLoading(true);
        const params = new URLSearchParams({ range: trendRange });
        if (group) params.set('group', group);
        fetch(apiUrl(`/api/wazuh/trend?${params.toString()}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                setTrendData(Array.isArray(data) && data.length > 0 ? data : null);
            })
            .catch(() => setTrendData(null))
            .finally(() => setTrendLoading(false));
    }, [trendRange]);

    interface CtipCountry { country: string; name: string; count: number; flag: string }
    interface WazuhAttackOrigin { country: string; name: string; count: number; label: string }

    const [ctipCountries, setCtipCountries] = useState<CtipCountry[] | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/ctip/countries'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setCtipCountries(Array.isArray(data) ? data : []))
            .catch(() => setCtipCountries([]));
    }, []);

    const [wazuhAttackOrigins, setWazuhAttackOrigins] = useState<WazuhAttackOrigin[] | null>(null);

    useEffect(() => {
        const group = getPortalContext().wazuhGroup;
        fetch(apiUrl(`/api/wazuh/attack-origins${group ? `?group=${encodeURIComponent(group)}` : ''}`), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setWazuhAttackOrigins(Array.isArray(data) ? data : []))
            .catch(() => setWazuhAttackOrigins([]));
    }, []);

    const [nigeriaAdvisories, setNigeriaAdvisories] = useState<FeedAdvisory[] | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/advisories'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setNigeriaAdvisories(Array.isArray(data?.advisories) ? data.advisories : []))
            .catch(() => setNigeriaAdvisories([]));
    }, []);

    const [clients, setClients] = useState<OnboardedClient[] | null>(null);
    const [clientsLoading, setClientsLoading] = useState(true);

    useEffect(() => {
        fetch(apiUrl('/api/customers'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => setClients(Array.isArray(data?.customers) ? data.customers : []))
            .catch(() => setClients([]))
            .finally(() => setClientsLoading(false));
    }, []);

    const [vendorRisk, setVendorRisk] = useState<{ label: string; avg: number } | null>(null);

    useEffect(() => {
        fetch(apiUrl('/api/vendor-assessments'), { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                const assessments = Array.isArray(data?.assessments) ? data.assessments : [];
                const scored = assessments.filter((a: { risk_score: number | null }) => typeof a.risk_score === 'number');
                if (scored.length === 0) { setVendorRisk(null); return; }
                const avg = scored.reduce((s: number, a: { risk_score: number }) => s + a.risk_score, 0) / scored.length;
                const label = avg >= 75 ? 'High' : avg >= 50 ? 'Medium' : 'Low';
                setVendorRisk({ label, avg: Math.round(avg) });
            })
            .catch(() => setVendorRisk(null));
    }, []);

    const trendBars = trendData
        ? (() => {
            const maxAlerts = Math.max(...trendData.map(d => d.alerts), 1);
            return trendData.map(d => ({
                heightPct: Math.max(4, Math.round((d.alerts / maxAlerts) * 100)),
                label: d.label,
                title: `${d.alerts} alerts, ${d.incidents} high severity, ${d.critical} critical`,
                critical: d.critical > 0,
            }));
        })()
        : [40, 55, 30, 85, 42, 60, 70, 95, 45, 60, 80, 100].map((val, i) => ({ heightPct: val, label: `W${i + 1}`, title: undefined, critical: false }));

    const hasClients = (clients?.length ?? 0) > 0;
    const critical = criticalAlertsCount ?? 0;
    const openTotal = openIncidentsCount ?? 0;
    const riskScoreValue = !hasClients ? 0 : Math.min(100, critical * 10 + openTotal * 2);
    const platformOperational = wazuhAgents !== null && ctipStats !== null;

    const THREAT_VECTORS_FALLBACK = [
        { label: "Malware", pct: 100, color: '#CC2B2B' },
        { label: "Phishing", pct: 82, color: '#D97706' },
        { label: "Botnet", pct: 58, color: '#2B3BCC' },
        { label: "Ransomware", pct: 25, color: '#CC2B2B' },
        { label: "DDoS", pct: 16, color: '#2B3BCC' },
        ];

    const kpiCards: KpiCardProps[] = [
        {
            label: 'Total Assets',
            value: wazuhAgents ? wazuhAgents.total.toLocaleString() : '...',
            trend: '',
            type: 'blue',
            icon: Monitor,
        },
        {
            label: 'Active Incidents',
            value: openIncidentsCount !== null ? String(openIncidentsCount) : '...',
            trend: '',
            type: 'orange',
            icon: AlertTriangle,
        },
        {
            label: 'Critical Alerts',
            value: criticalAlertsCount !== null ? String(criticalAlertsCount) : '...',
            trend: '',
            type: 'red',
            icon: AlertOctagon,
        },
        {
            label: 'Open Incidents',
            value: openIncidentsCount !== null ? String(openIncidentsCount) : '...',
            trend: '',
            type: 'orange',
            icon: Clock,
        },
        {
            label: 'Risk Score',
            value: `${riskScoreValue}/100`,
            trend: '',
            type: 'blue',
            icon: Activity,
        },
        {
            label: 'Vendor Risk',
            value: vendorRisk ? vendorRisk.label : 'No Data',
            trend: '',
            type: 'purple',
            icon: Building2,
        },
        {
            label: 'Clients Protected',
            value: clients ? String(clients.length) : '...',
            trend: '',
            type: 'blue',
            icon: Users,
        },
        {
            label: 'Platform Health',
            value: platformOperational ? 'Operational' : 'Degraded',
            trend: '',
            type: platformOperational ? 'blue' : 'red',
            icon: Server,
            subValue: ctipStats ? `${ctipStats.sources_active} sources active` : undefined,
        },
    ];

    return (
        <div className="space-y-6">
            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider -mb-2">Aggregated across all onboarded clients</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {kpiCards.map((kpi, idx) => <KpiCard key={idx} {...kpi} />)}
            </div>

            <NigeriaThreatMap advisories={nigeriaAdvisories} />

            <WorldGlobe />

            <ComplianceSummary />

            <OnboardedClientsWidget clients={clients} loading={clientsLoading} />

            <ChartWrapper title="Security Posture & Incident Activity Trends">
                <div className="flex items-center gap-2 mb-3">
                    {([['24h', 'Last 24 Hours'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days']] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setTrendRange(val)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                                trendRange === val
                                    ? 'bg-grey-100 text-white border-amber'
                                    : 'bg-card border-border text-foreground-muted hover:text-foreground'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
                {trendLoading ? (
                    <div className="w-full h-full flex items-end gap-2 pt-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div style={{ height: `${30 + (i % 5) * 10}%` }} className="w-full rounded-t bg-card-muted animate-pulse" />
                                <span className="text-[9px] text-border mt-1.5 font-medium">&nbsp;</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-end gap-2 pt-4">
                        {trendBars.map((bar, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group" title={bar.title}>
                                <div style={{ height: `${bar.heightPct}%`, backgroundColor: bar.critical ? '#EF4444' : '#D97706' }} className="w-full rounded-t opacity-70 group-hover:opacity-100 transition-all duration-200" />
                                <span className="text-[9px] text-foreground-muted mt-1.5 font-medium">{bar.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </ChartWrapper>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 border border-border rounded-xl shadow-sm">
                    <h4 className="font-bold text-[11px] text-foreground uppercase tracking-widest mb-5 border-l-2 border-amber pl-2">Threat Vectors Distribution</h4>
                    <div className="space-y-4">
                        {(threatVectors ?? THREAT_VECTORS_FALLBACK).map(v => (
                            <div key={v.label}>
                                <div className="flex justify-between text-xs font-semibold text-foreground mb-1.5"><span>{v.label}</span><span>{v.pct}%</span></div>
                                <div className="w-full bg-card-muted h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${v.pct}%`, backgroundColor: v.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-card p-6 border border-border rounded-xl shadow-sm">
                    <h4 className="font-bold text-[11px] text-foreground uppercase tracking-widest mb-5 border-l-2 border-amber pl-2">Monitored Assets Proportions</h4>
                    <div className="space-y-4">
                        {[['Cloud Production Assets', '50%', '#D97706'], ['Enterprise Workstations', '25%', '#16A34A'], ['On-Prem Infrastructure', '15%', '#16A34A']].map(([n, p, c]) => (
                            <div key={n}>
                                <div className="flex justify-between text-xs font-semibold text-foreground mb-1.5"><span>{n}</span><span>{p}</span></div>
                                <div className="w-full bg-card-muted h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: p, backgroundColor: c }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                {([['1h', 'Last 1hr'], ['24h', 'Last 24hr'], ['7d', 'Last 7 days']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setFeedRange(val)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                            feedRange === val
                                ? 'bg-grey-100 text-white border-amber'
                                : 'bg-card border-border text-foreground-muted hover:text-foreground'
                        }`}>
                        {label}
                    </button>
                ))}
            </div>

            {feedLoading ? (
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 bg-card-muted rounded animate-pulse" />)}
                </div>
            ) : wazuhAlerts !== null && wazuhAlerts.length === 0 ? (
                <div className="bg-card border border-border rounded-xl shadow-sm p-10 text-center">
                    <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                        No recent high-severity activity. Onboard clients to begin monitoring their environments.
                    </p>
                </div>
            ) : (
                <DataTable
                    title="Real-Time Global Activity Feed"
                    columns={['Time', 'Telemetry Event Details', 'Severity', 'Ingestion Source', 'Status']}
                    data={wazuhAlerts ?? []}
                    renderRow={(row, idx) => (
                        <tr key={idx} className="hover:bg-card-muted transition-colors border-b border-border">
                            <td className="px-6 py-4 font-mono text-xs text-foreground-muted">{row.time}</td>
                            <td className="px-6 py-4 font-semibold text-xs text-foreground">{row.event}</td>
                            <td className="px-6 py-4"><StatusBadge value={row.severity} /></td>
                            <td className="px-6 py-4 text-xs font-mono text-foreground-muted">{row.source}</td>
                            <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
                        </tr>
                    )}
                />
            )}
        </div>
    );
};

function MiniCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-muted p-5">
      <p className="text-sm text-foreground-muted">{title}</p>

      <h3 className={`mt-2 text-3xl font-black ${color}`}>
        {value}
      </h3>
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-4 w-4 rounded ${color}`} />
      <span className="text-sm text-foreground-muted">
        {label}
      </span>
    </div>
  );
}