'use client';

import { useState, useEffect } from 'react';
import {
    Bell, CheckCircle, AlertTriangle, Send, MessageSquare, Mail, Phone, Zap, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface ChannelStatus {
    configured: boolean;
    name: string;
    description: string;
}

interface AlertChannels {
    slack: ChannelStatus;
    email: ChannelStatus;
    sms: ChannelStatus;
    pagerduty: ChannelStatus;
}

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface RecentAlert {
    id: string;
    title: string;
    severity: Severity;
    channels: string[];
    sent_at: string;
    acknowledged: boolean;
    affected_host: string;
}

// Demo history — real dispatch history isn't persisted anywhere yet (POST /api/alerts/incident
// is fire-and-forget); this shows what the feed will look like once it is.
const MOCK_RECENT_ALERTS: RecentAlert[] = [
    {
        id: 'al_001',
        title: 'Critical: Tor Exit Node Detected on Network',
        severity: 'critical',
        channels: ['slack'],
        sent_at: '2026-08-12 14:23:11',
        acknowledged: false,
        affected_host: 'ec2-sensor (10.0.1.30)',
    },
    {
        id: 'al_002',
        title: 'High: SSH Brute Force Attempt — 47 Failed Logins',
        severity: 'high',
        channels: ['slack'],
        sent_at: '2026-08-12 11:45:02',
        acknowledged: true,
        affected_host: 'ec2-app-server (10.0.1.10)',
    },
    {
        id: 'al_003',
        title: 'Medium: CVE-2024-3094 Detected — xz-utils Backdoor',
        severity: 'medium',
        channels: ['slack'],
        sent_at: '2026-08-11 09:15:44',
        acknowledged: true,
        affected_host: 'ec2-wazuh-server (10.0.1.20)',
    },
];

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; border: string; dot: string }> = {
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500 animate-pulse' },
    high: { color: 'text-amber', bg: 'bg-grey-100', border: 'border-amber/30', dot: 'bg-amber' },
    medium: { color: 'text-amber', bg: 'bg-grey-100', border: 'border-amber/30', dot: 'bg-amber' },
    low: { color: 'text-blue', bg: 'bg-blue/10', border: 'border-blue/30', dot: 'bg-blue' },
};

const CHANNEL_ICONS: Record<string, LucideIcon> = { slack: MessageSquare, email: Mail, sms: Phone, pagerduty: Zap };

const TABS = [
    { id: 'channels', label: 'Channels' },
    { id: 'history', label: 'Alert History' },
    { id: 'send', label: 'Send Alert' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function AlertCommunication() {
    const [channels, setChannels] = useState<AlertChannels | null>(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [sendForm, setSendForm] = useState({ title: '', severity: 'high', description: '', host: '' });
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('channels');

    useEffect(() => {
        fetch(apiUrl('/api/alerts/status'), { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => setChannels(d.channels ?? null))
            .catch(() => {});
    }, []);

    const sendTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(apiUrl('/api/alerts/test'), { method: 'POST' });
            const data = await res.json();
            setTestResult(data.message);
        } catch {
            setTestResult('Test failed — check console');
        } finally {
            setTesting(false);
        }
    };

    const sendAlert = async () => {
        if (!sendForm.title) return;
        setSending(true);
        setSendResult(null);
        try {
            const res = await fetch(apiUrl('/api/alerts/incident'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: sendForm.title,
                    severity: sendForm.severity,
                    description: sendForm.description,
                    affected_host: sendForm.host,
                }),
            });
            const data = await res.json();
            setSendResult(data.message);
        } catch {
            setSendResult('Send failed');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Alert Communication</h1>
                <p className="text-xs text-foreground-muted">SecOps & Response · Multi-channel incident notifications. Escalate critical alerts to on-call SOC teams via Slack, email, SMS, and PagerDuty.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === t.id ? 'border-blue text-blue' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* CHANNELS TAB */}
            {activeTab === 'channels' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {channels && Object.entries(channels).map(([key, channel]) => {
                            const Icon = CHANNEL_ICONS[key] ?? Bell;
                            return (
                                <div key={key} className={`bg-card border rounded-xl p-5 ${channel.configured ? 'border-border' : 'border-dashed border-grey-300'}`}>
                                    <div className="flex items-start justify-between mb-3 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${channel.configured ? 'bg-blue/10' : 'bg-card-muted'}`}>
                                                <Icon size={20} className={channel.configured ? 'text-blue' : 'text-grey-300'} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm text-foreground">{channel.name}</div>
                                                <div className="text-xs text-foreground-muted truncate">{channel.description}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <div className={`w-2 h-2 rounded-full ${channel.configured ? 'bg-green' : 'bg-grey-300'}`} />
                                            <span className={`text-xs font-medium ${channel.configured ? 'text-green' : 'text-foreground-muted'}`}>{channel.configured ? 'Active' : 'Not configured'}</span>
                                        </div>
                                    </div>

                                    {!channel.configured && (
                                        <div className="text-xs text-foreground-muted bg-card-muted rounded-lg p-2">
                                            {key === 'sms' && 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to .env'}
                                            {key === 'pagerduty' && 'Add PAGERDUTY_API_KEY to .env ($21/user/month)'}
                                            {key === 'email' && 'Add SENDGRID_API_KEY to .env (free 100/day at signup.sendgrid.com)'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Test button */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <div className="font-medium text-sm text-foreground">Test Alert Channels</div>
                                <div className="text-xs text-foreground-muted">Sends a test message to all configured channels</div>
                            </div>
                            <button onClick={sendTest} disabled={testing}
                                className="flex items-center gap-2 bg-blue hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
                                {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                {testing ? 'Sending…' : 'Send Test'}
                            </button>
                        </div>
                        {testResult && (
                            <div className="mt-3 text-sm text-green bg-green/10 border border-green/30 rounded-lg px-3 py-2">{testResult}</div>
                        )}
                    </div>

                    {/* Escalation rules */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Escalation Rules</h3>
                        <div className="space-y-3">
                            {[
                                { severity: 'CRITICAL', rule: 'Slack + SMS + PagerDuty', threshold: 'Rule level ≥ 13' },
                                { severity: 'HIGH', rule: 'Slack + Email', threshold: 'Rule level ≥ 10' },
                                { severity: 'MEDIUM', rule: 'Slack only', threshold: 'Rule level ≥ 7' },
                                { severity: 'LOW', rule: 'Log only', threshold: 'Rule level < 7' },
                            ].map((row) => (
                                <div key={row.severity} className="flex items-center justify-between text-sm flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            row.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                                            row.severity === 'HIGH' ? 'bg-amber text-white' :
                                            row.severity === 'MEDIUM' ? 'border border-amber/40 text-amber' :
                                            'border border-grey-300 text-foreground-muted'
                                        }`}>{row.severity}</span>
                                        <span className="text-foreground-muted text-xs">{row.threshold}</span>
                                    </div>
                                    <span className="text-xs text-foreground font-medium">{row.rule}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-xs text-foreground-muted">
                            Escalation rules apply automatically when Wazuh is connected. Configure custom rules in Settings.
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {MOCK_RECENT_ALERTS.map((alert) => {
                        const cfg = SEVERITY_CONFIG[alert.severity];
                        return (
                            <div key={alert.id} className={`bg-card border rounded-xl p-4 ${cfg.border}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm text-foreground">{alert.title}</div>
                                            <div className="text-xs text-foreground-muted mt-0.5">{alert.affected_host} · {alert.sent_at}</div>
                                            <div className="flex items-center gap-2 mt-2">
                                                {alert.channels.map((ch) => (
                                                    <span key={ch} className="text-[10px] bg-blue/10 text-blue px-2 py-0.5 rounded-full font-medium">{ch}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{alert.severity.toUpperCase()}</span>
                                        {alert.acknowledged ? <CheckCircle size={14} className="text-green" /> : <AlertTriangle size={14} className="text-red-500" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SEND TAB */}
            {activeTab === 'send' && (
                <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
                    <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Send Manual Alert</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Alert Title</label>
                            <input
                                type="text"
                                value={sendForm.title}
                                onChange={(e) => setSendForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Suspicious login from unknown IP"
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 text-foreground"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Severity</label>
                            <select
                                value={sendForm.severity}
                                onChange={(e) => setSendForm((f) => ({ ...f, severity: e.target.value }))}
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue text-foreground"
                            >
                                {['critical', 'high', 'medium', 'low'].map((s) => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Description</label>
                            <textarea
                                value={sendForm.description}
                                onChange={(e) => setSendForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Describe the incident…"
                                rows={3}
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 text-foreground resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Affected Host</label>
                            <input
                                type="text"
                                value={sendForm.host}
                                onChange={(e) => setSendForm((f) => ({ ...f, host: e.target.value }))}
                                placeholder="e.g. ec2-app-server"
                                className="w-full mt-1 border border-border bg-card-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 text-foreground"
                            />
                        </div>
                        <button
                            onClick={sendAlert}
                            disabled={sending || !sendForm.title}
                            className="w-full flex items-center justify-center gap-2 bg-red hover:bg-red-hover text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            {sending ? 'Dispatching…' : 'Dispatch Alert'}
                        </button>
                        {sendResult && (
                            <div className="text-sm text-green bg-green/10 border border-green/30 rounded-lg px-3 py-2">{sendResult}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
