'use client';

import { useEffect, useState } from 'react';
import { NigeriaMap2 } from './NigeriaMap2';
import { nigeriaThreatData } from '@/lib/mock/nigeria-threat-data';
import { apiUrl } from '@/lib/api';

type StateThreatInfo = typeof nigeriaThreatData[keyof typeof nigeriaThreatData];

// Shape of a row from Supabase's nigeria_state_threats table (see backend/novrsoc_supabase_schema.sql),
// as returned by GET /api/geo/nigeria/states.
interface StateThreatRow {
    state: string;
    level: string;
    primary_threat: string;
    attacks: number;
    malware: string | null;
    target: string | null;
    source_countries: string[] | null;
    iocs: number;
    mitre: string[] | null;
    color: string | null;
}

function rowToStateInfo(row: StateThreatRow): StateThreatInfo {
    return {
        level: row.level,
        primaryThreat: row.primary_threat,
        attacks: row.attacks,
        malware: row.malware ?? '—',
        target: row.target ?? '—',
        sourceCountries: row.source_countries ?? [],
        iocs: row.iocs,
        mitre: row.mitre ?? [],
        color: row.color ?? '#7A8099',
        activity: [],
    } as StateThreatInfo;
}

const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="h-[3px] bg-grey-100" />
        {children}
    </div>
);

const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-2 border-l-2 border-amber pl-2">
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest">{title}</h3>
        </div>
    </div>
);

export interface FeedAdvisory {
    id: number;
    title: string;
    severity: string;
    published_at: string;
}

const STAT_CARDS: { title: string; value: string; color: string }[] = [
    { title: 'Threat Score', value: '91', color: 'text-red-500' },
    { title: "Today's Attacks", value: '1,284', color: 'text-red-500' },
    { title: 'Critical States', value: '5', color: 'text-purple' },
    { title: 'Malware', value: '314', color: 'text-blue' },
    { title: 'Botnets', value: '88', color: 'text-blue' },
    { title: 'Phishing', value: '123', color: 'text-amber' },
    { title: 'Ransomware', value: '21', color: 'text-red-500' },
    { title: 'DDoS', value: '47', color: 'text-blue' },
];

const STATE_KPIS: [string, number][] = [
    ['Malware Lagos', 3750],
    ['Phishing Lagos', 8000],
    ['BotNet Kano', 950],
    ['Ransomware Rivers', 1650],
    ['DDoS Abuja', 1350],
    ['Cred-Theft Lagos', 1800],
];

const LEGEND: { label: string; color: string }[] = [
    { label: 'Malware', color: '#CC2B2B' },
    { label: 'Phishing', color: '#D97706' },
    { label: 'Botnet', color: '#6B1FA8' },
    { label: 'Ransomware', color: '#CC2B2B' },
    { label: 'DDoS', color: '#2B3BCC' },
    { label: 'Credential Theft', color: '#D97706' },
];

const TIME_RANGES: { value: '1h' | '24h' | '7d'; label: string }[] = [
    { value: '1h', label: 'Last 1hr' },
    { value: '24h', label: 'Last 24hr' },
    { value: '7d', label: 'Last 7 days' },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NigeriaThreatMap = ({ advisories }: { advisories?: FeedAdvisory[] | null }) => {
    const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
    const [stateOverrides, setStateOverrides] = useState<Record<string, StateThreatInfo>>({});

    useEffect(() => {
        fetch(apiUrl('/api/geo/nigeria/states'), { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((rows: StateThreatRow[]) => {
                if (!Array.isArray(rows) || rows.length === 0) return;
                const overrides: Record<string, StateThreatInfo> = {};
                for (const row of rows) {
                    if (row?.state) overrides[row.state] = rowToStateInfo(row);
                }
                setStateOverrides(overrides);
            })
            // Backend/Supabase not reachable or not configured yet — the map keeps rendering
            // from its bundled mock data (see NigeriaMap2's stateOverrides fallback).
            .catch(() => {});
    }, []);

    return (
        <Card>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <SectionHeader title="Nigeria National Threat Landscape" />
                        <p className="text-sm text-foreground-muted">Real-time cyber activity across Nigerian states</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-foreground-muted">Threat Level</p>
                        <h2 className="text-2xl font-black text-red-500">HIGH</h2>
                    </div>
                </div>

                {/* Main */}
                <div className="grid lg:grid-cols-5 gap-6">
                    {/* MAP */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs font-semibold tracking-widest text-foreground uppercase">Live Attack Map</p>
                                <p className="text-xs text-foreground-muted mt-0.5">Inbound attacks targeting NovrSOC-protected clients</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {TIME_RANGES.map((r) => (
                                    <button
                                        key={r.value}
                                        onClick={() => setTimeRange(r.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            timeRange === r.value ? 'bg-blue text-white' : 'bg-card-muted text-foreground-muted border border-border hover:text-foreground'
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card-muted p-4">
                            <NigeriaMap2 stateOverrides={stateOverrides} />
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="lg:col-span-2 flex flex-col gap-4 grid grid-cols-2">
                        {STAT_CARDS.map((stat) => (
                            <div key={stat.title} className="rounded-xl border border-border p-4">
                                <p className="text-xs uppercase tracking-wide text-foreground-muted">{stat.title}</p>
                                <h3 className={`text-3xl font-black mt-2 ${stat.color}`}>{stat.value}</h3>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-6 text-sm flex-wrap">
                    {LEGEND.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.label}
                        </div>
                    ))}
                </div>

                {/* State KPIs */}
                <div className="grid grid-cols-6 gap-4 mt-6">
                    {STATE_KPIS.map(([state, score]) => (
                        <div key={state} className="rounded-xl border border-border p-4 text-center">
                            <p className="font-bold text-foreground">{state}</p>
                            <p className="text-1xl font-black text-red-500 mt-2">{score}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};
