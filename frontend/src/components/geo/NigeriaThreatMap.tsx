'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { NigeriaMap2, type NigeriaStateData } from './NigeriaMap2';
import { apiUrl } from '@/lib/api';

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

interface NigeriaThreatsSummary {
    total_threats: number;
    threat_score: number;
    critical_states: number;
    states_affected: number;
    top_state: string | null;
    today_attacks: number;
    malware: number;
    phishing: number;
    botnets: number;
    ransomware: number;
    ddos: number;
    credential_theft: number;
    highest_attack_states: { name: string; count: number; state: string; threat_type: string }[];
    threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR';
    error?: string;
}

interface EnrichmentCoverage {
    unattributed_ips: number;
    ips_enriched: number;
    nigerian_confirmed: number;
    threats_added_by_enrichment: number;
}

interface NigeriaThreatsResponse {
    states: NigeriaStateData[];
    summary: NigeriaThreatsSummary;
    source: string;
    enrichment_coverage?: EnrichmentCoverage;
    generated_at: string;
}

const TIME_RANGES: { value: '1h' | '24h' | '7d'; label: string }[] = [
    { value: '1h', label: 'Last 1hr' },
    { value: '24h', label: 'Last 24hr' },
    { value: '7d', label: 'Last 7 days' },
];

const THREAT_LEVEL_COLOR: Record<string, string> = {
    CRITICAL: 'text-red-500',
    HIGH: 'text-orange',
    MEDIUM: 'text-amber-500',
    LOW: 'text-blue',
    CLEAR: 'text-green-500',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NigeriaThreatMap = ({ advisories }: { advisories?: FeedAdvisory[] | null }) => {
    const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
    const [colorMode, setColorMode] = useState<'threat' | 'region'>('threat');
    const [data, setData] = useState<NigeriaThreatsResponse | null>(null);
    const [popupState, setPopupState] = useState<NigeriaStateData | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mapSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(apiUrl(`/api/dashboard/nigeria-threats?range=${timeRange}`), { cache: 'no-store' })
            .then((r) => r.json())
            .then(setData)
            // Real endpoint, no mock fallback — a failed fetch just means "no data to show
            // yet" (data stays null, everything below renders its own zero/loading state).
            .catch(() => {});
    }, [timeRange]);

    useEffect(() => {
        const handleFsChange = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            mapSectionRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    const summary = data?.summary;
    const states = data?.states ?? [];

    const STAT_CARDS: { title: string; value: number | string; color: string }[] = [
        { title: 'Threat Score', value: summary?.threat_score ?? '—', color: 'text-red-500' },
        { title: "Today's Attacks", value: summary?.today_attacks ?? '—', color: 'text-red-500' },
        { title: 'Critical States', value: summary?.critical_states ?? '—', color: 'text-purple' },
        { title: 'States Affected', value: summary ? `${summary.states_affected}/37` : '—', color: 'text-purple' },
        { title: 'Most Targeted', value: summary?.top_state ?? 'None', color: 'text-foreground' },
        { title: 'Malware', value: summary?.malware ?? '—', color: 'text-blue' },
        { title: 'Botnets', value: summary?.botnets ?? '—', color: 'text-blue' },
        { title: 'Phishing', value: summary?.phishing ?? '—', color: 'text-amber-500' },
        { title: 'Ransomware', value: summary?.ransomware ?? '—', color: 'text-red-500' },
        { title: 'DDoS', value: summary?.ddos ?? '—', color: 'text-blue' },
    ];

    const highestAttackStates = summary?.highest_attack_states ?? [];

    return (
        <Card>
            <div ref={mapSectionRef} className={isFullscreen ? 'fixed inset-0 z-40 bg-white p-6 overflow-auto' : 'p-6'}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <SectionHeader title="Nigeria National Threat Landscape" />
                        <p className="text-sm text-foreground-muted">
                            Real-time cyber activity across Nigerian states
                            {data?.summary.error && <span className="text-amber-500"> · {data.summary.error}</span>}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-foreground-muted">Threat Level</p>
                        <h2 className={`text-2xl font-black ${THREAT_LEVEL_COLOR[summary?.threat_level ?? ''] ?? 'text-foreground-muted'}`}>
                            {summary?.threat_level ?? 'LOADING'}
                        </h2>
                    </div>
                </div>

                {/* Honest zero-state — total_threats === 0 is a real, common state (no
                    Nigerian-geolocated events this window), not an error. Distinct from
                    summary.error, which means the fetch itself failed. */}
                {data && summary?.total_threats === 0 && !summary.error && (
                    <div className="mb-3 flex items-center gap-2 bg-card-muted border border-border rounded-xl px-4 py-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue flex-shrink-0" />
                        <span className="text-xs text-foreground-muted">
                            Monitoring active — no Nigerian-origin threats detected in this time range. Map will populate as threats are detected.
                        </span>
                    </div>
                )}

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
                                <div className="flex items-center gap-0.5 bg-card-muted border border-border rounded-lg p-0.5 mr-1">
                                    {(['threat', 'region'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setColorMode(mode)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                                                colorMode === mode ? 'bg-purple text-white' : 'text-foreground-muted hover:text-foreground'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
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
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-1.5 rounded-lg hover:bg-[#F5F0FF] text-foreground-muted hover:text-purple transition-colors"
                                    title="Toggle fullscreen"
                                    aria-label="Toggle fullscreen"
                                >
                                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card-muted p-4">
                            <NigeriaMap2
                                liveStates={states}
                                colorMode={colorMode}
                                onStateSelect={setPopupState}
                                selectedState={popupState}
                                onCloseSelection={() => setPopupState(null)}
                            />
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="lg:col-span-2 flex flex-col gap-4 grid grid-cols-2">
                        {STAT_CARDS.map((stat) => (
                            <div key={stat.title} className="rounded-xl border border-border p-4">
                                <p className="text-xs uppercase tracking-wide text-foreground-muted">{stat.title}</p>
                                <h3 className={`font-black mt-2 truncate ${stat.color} ${typeof stat.value === 'string' && stat.value.length > 6 ? 'text-lg' : 'text-3xl'}`} title={String(stat.value)}>
                                    {stat.value}
                                </h3>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data source badges */}
                <div className="flex items-center gap-2 mt-6 mb-3 px-1 flex-wrap">
                    <span className="text-[10px] text-foreground-muted uppercase tracking-wider font-medium">Data sources:</span>
                    {[
                        { name: 'Wazuh', active: !!data && !data.summary.error, color: 'bg-purple' },
                        { name: 'IPregistry', active: !!data, color: 'bg-blue' },
                        { name: 'RIPE Stat', active: !!data, color: 'bg-blue' },
                        { name: 'AFRINIC', active: !!data, color: 'bg-green' },
                    ].map((source) => (
                        <div key={source.name} className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${source.active ? source.color : 'bg-grey-300'}`} />
                            <span className="text-[9px] font-medium text-foreground-muted">{source.name}</span>
                        </div>
                    ))}
                    <span className="text-[10px] text-foreground-muted ml-auto">
                        {data?.enrichment_coverage?.nigerian_confirmed ?? 0} Nigerian IPs enriched beyond Wazuh&apos;s own geolocation
                    </span>
                </div>

                {/* Highest attack states — real data, no filler when there are fewer than 6 */}
                <div className="grid grid-cols-6 gap-3 mt-6">
                    {highestAttackStates.map((item, i) => (
                        <div
                            key={i}
                            className="bg-white border border-border rounded-xl p-3 text-center cursor-pointer hover:border-purple/30 transition-colors"
                            onClick={() => {
                                const found = states.find((s) => s.name === item.state);
                                if (found) setPopupState(found);
                            }}
                        >
                            <div className="text-[10px] text-foreground-muted uppercase tracking-wider mb-1 truncate">{item.name}</div>
                            <div className="font-black text-xl text-red-500">{item.count}</div>
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, 6 - highestAttackStates.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-card-muted border border-border rounded-xl p-3 text-center">
                            <div className="text-[10px] text-grey-300 uppercase tracking-wider mb-1">No data</div>
                            <div className="font-black text-xl text-grey-300">—</div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};
