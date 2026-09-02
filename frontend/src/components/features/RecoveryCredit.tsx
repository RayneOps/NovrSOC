'use client';

import { useState, useEffect } from 'react';
import {
    AlertTriangle, CheckCircle, DollarSign, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Activity, Wifi,
} from 'lucide-react';
import { apiUrl, apiFetch } from '@/lib/api';

interface Incident {
    id: string;
    start: string;
    end: string;
    duration_mins: number;
    cause: string;
    resolved_by: string;
}

interface SLAEndpoint {
    id: string;
    name: string;
    url: string;
    status: string;
    uptime_pct_month: number;
    downtime_seconds_month: number;
    avg_response_ms: number;
    incidents: Incident[];
    client: {
        name: string;
        plan: string;
        monthly_fee_usd: number;
        sla_target_pct: number;
    };
    credit: {
        breached: boolean;
        credit_pct: number;
        credit_usd: number;
        tier: string;
    };
}

interface SLASummary {
    total_endpoints: number;
    breached: number;
    total_credits_usd: number;
    uptimerobot_status: string;
    period: string;
}

function formatDowntime(secs: number): string {
    if (secs === 0) return '0 seconds';
    if (secs < 60) return `${secs} seconds`;
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins < 60) return `${mins}m ${s}s`;
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
}

function uptimePctColor(pct: number, target: number): string {
    if (pct >= target) return 'text-green';
    if (pct >= target - 1) return 'text-amber';
    return 'text-red-500';
}
function uptimeBarColor(pct: number, target: number): string {
    if (pct >= target) return 'bg-green';
    if (pct >= target - 1) return 'bg-amber';
    return 'bg-red-500';
}

export function RecoveryCredit() {
    const [endpoints, setEndpoints] = useState<SLAEndpoint[]>([]);
    const [summary, setSummary] = useState<SLASummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(apiUrl('/api/sla/overview'), { cache: 'no-store' });
            const data = await res.json();
            setEndpoints(Array.isArray(data.endpoints) ? data.endpoints : []);
            setSummary(data.summary ?? null);
        } catch {
            // show empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw size={24} className="animate-spin text-blue" />
            </div>
        );
    }

    const breachedEndpoints = endpoints.filter((ep) => ep.credit.breached);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Recovery Credit (SLA)</h1>
                <p className="text-xs text-foreground-muted">Data Continuity · Track application uptime against SLA targets. Calculate financial credit obligations for clients when availability commitments are not met.</p>
            </div>

            {/* SLA breach alert */}
            {breachedEndpoints.length > 0 && (
                <div className="bg-grey-100 border border-amber/30 rounded-xl p-4 flex items-start gap-3 flex-wrap">
                    <AlertTriangle size={18} className="text-amber flex-shrink-0 mt-0.5" />
                    <div className="min-w-[200px]">
                        <div className="font-semibold text-sm text-amber mb-1">
                            SLA breach detected — ${summary?.total_credits_usd.toLocaleString()} in credits owed
                        </div>
                        {breachedEndpoints.map((ep) => (
                            <div key={ep.id} className="text-xs text-amber">
                                • {ep.client.name}: {ep.uptime_pct_month.toFixed(3)}% uptime (target {ep.client.sla_target_pct}%) — ${ep.credit.credit_usd.toLocaleString()} credit
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Monitored Endpoints', value: summary.total_endpoints, border: 'border-t-blue' },
                        { label: 'SLA Breaches', value: summary.breached, border: 'border-t-red-500' },
                        { label: 'Credits Owed', value: `$${summary.total_credits_usd.toLocaleString()}`, border: summary.total_credits_usd > 0 ? 'border-t-amber' : 'border-t-green' },
                        { label: 'Period', value: summary.period, border: 'border-t-purple' },
                    ].map((card) => (
                        <div key={card.label} className={`bg-card border border-border rounded-xl p-4 border-t-4 ${card.border}`}>
                            <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1">{card.label}</div>
                            <div className="font-heading font-black text-xl text-foreground">{card.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Independent Uptime Monitor status */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs ${
                summary?.uptimerobot_status === 'connected' ? 'bg-green/10 border-green/30 text-green' : 'bg-card-muted border-border text-foreground-muted'
            }`}>
                <Wifi size={14} />
                <span>
                    Independent Uptime Monitor: {summary?.uptimerobot_status === 'connected'
                        ? 'Connected — independent uptime verification active'
                        : 'Not connected — third-party verification not yet configured'}
                </span>
            </div>

            {/* Endpoint list */}
            <div className="space-y-3">
                {endpoints.map((ep) => {
                    const isExpanded = expanded === ep.id;
                    const slaGap = ep.client.sla_target_pct - ep.uptime_pct_month;

                    return (
                        <div key={ep.id} className={`bg-card border rounded-xl overflow-hidden transition-all ${ep.credit.breached ? 'border-amber/30' : 'border-border'}`}>
                            {/* Summary row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 cursor-pointer hover:bg-card-muted transition-colors" onClick={() => setExpanded(isExpanded ? null : ep.id)}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ep.status === 'up' ? 'bg-green' : 'bg-red-500 animate-pulse'}`} />
                                    <div>
                                        <div className="font-medium text-sm text-foreground">{ep.name}</div>
                                        <div className="text-xs text-foreground-muted">{ep.client.name} · {ep.client.plan} · SLA: {ep.client.sla_target_pct}%</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                                    <div className="text-right">
                                        <div className={`font-heading font-black text-lg ${uptimePctColor(ep.uptime_pct_month, ep.client.sla_target_pct)}`}>{ep.uptime_pct_month.toFixed(3)}%</div>
                                        <div className="text-[10px] text-foreground-muted">uptime this month</div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-heading font-black text-base text-foreground">{formatDowntime(ep.downtime_seconds_month)}</div>
                                        <div className="text-[10px] text-foreground-muted">total downtime</div>
                                    </div>

                                    <div className="text-right min-w-[80px]">
                                        {ep.credit.breached ? (
                                            <>
                                                <div className="font-heading font-black text-base text-amber">${ep.credit.credit_usd.toLocaleString()}</div>
                                                <div className="text-[10px] text-amber">{ep.credit.credit_pct}% credit</div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-1 justify-end">
                                                <CheckCircle size={14} className="text-green" />
                                                <span className="text-xs text-green font-medium">SLA Met</span>
                                            </div>
                                        )}
                                    </div>

                                    {isExpanded ? <ChevronUp size={16} className="text-foreground-muted" /> : <ChevronDown size={16} className="text-foreground-muted" />}
                                </div>
                            </div>

                            {/* Uptime bar */}
                            <div className="px-5 pb-3">
                                <div className="h-1.5 bg-card-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${uptimeBarColor(ep.uptime_pct_month, ep.client.sla_target_pct)}`} style={{ width: `${Math.min(100, ep.uptime_pct_month)}%` }} />
                                </div>
                                {ep.credit.breached && (
                                    <div className="text-[10px] text-amber mt-1">{slaGap.toFixed(3)}% below SLA target — {ep.credit.tier}</div>
                                )}
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div className="border-t border-border p-5 bg-card-muted">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                        <div>
                                            <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">Metrics</div>
                                            <div className="space-y-2">
                                                {[
                                                    ['Avg Response', `${ep.avg_response_ms}ms`],
                                                    ['Monthly Fee', ep.client.monthly_fee_usd > 0 ? `$${ep.client.monthly_fee_usd.toLocaleString()}` : 'Internal'],
                                                    ['Credit Owed', ep.credit.breached ? `$${ep.credit.credit_usd}` : 'None'],
                                                    ['Incidents', String(ep.incidents.length)],
                                                ].map(([label, value]) => (
                                                    <div key={label} className="flex justify-between text-xs">
                                                        <span className="text-foreground-muted">{label}</span>
                                                        <span className="text-foreground font-medium">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Incidents */}
                                        <div className="md:col-span-2">
                                            <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">Incidents This Month</div>
                                            {ep.incidents.length === 0 ? (
                                                <div className="flex items-center gap-2 text-xs text-green">
                                                    <CheckCircle size={13} /> No incidents — clean month
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {ep.incidents.map((inc) => (
                                                        <div key={inc.id} className="bg-card border border-border rounded-lg p-3">
                                                            <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                                                                <span className="text-xs font-medium text-foreground">{inc.duration_mins.toFixed(0)} min outage</span>
                                                                <span className="text-[10px] text-foreground-muted">{inc.start} → {inc.end}</span>
                                                            </div>
                                                            <div className="text-[11px] text-foreground-muted"><span className="font-medium text-red-500">Cause:</span> {inc.cause}</div>
                                                            <div className="text-[11px] text-foreground-muted mt-0.5"><span className="font-medium text-green">Resolved:</span> {inc.resolved_by}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
                                        {ep.credit.breached && (
                                            <button className="flex items-center gap-1.5 bg-amber hover:opacity-90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                                <DollarSign size={12} /> Issue Credit to {ep.client.name}
                                            </button>
                                        )}
                                        <button className="flex items-center gap-1.5 border border-border text-foreground-muted text-xs px-3 py-1.5 rounded-lg hover:border-grey-300 transition-colors">
                                            <Activity size={12} /> View Full Report
                                        </button>
                                        <a href={ep.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue hover:text-purple transition-colors sm:ml-auto">
                                            Check endpoint <ExternalLink size={11} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
