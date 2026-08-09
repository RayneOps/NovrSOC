'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const KEYS = [
    { name: 'CTIP Integration', service: 'Internal',       created: '01 Jul 2026', lastUsed: 'Today',  status: 'Active'   },
    { name: 'Anthropic API',    service: 'NovrAI',         created: '28 Jun 2026', lastUsed: 'Today',  status: 'Active'   },
    { name: 'Feed Source A',    service: 'Feed Collector', created: '01 Jul 2026', lastUsed: 'Today',  status: 'Active'   },
    { name: 'Feed Source B',    service: 'Feed Collector', created: '01 Jul 2026', lastUsed: 'Today',  status: 'Active'   },
    { name: 'Wazuh API',        service: 'SIEM',           created: 'Not configured', lastUsed: 'Never', status: 'Inactive' },
];

export default function APIKeysPage() {
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [newService, setNewService] = useState('');
    const [generated, setGenerated] = useState<string | null>(null);

    function handleGenerate(e: React.FormEvent) {
        e.preventDefault();
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const key = 'nsk_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        setGenerated(key);
    }

    return (
        <PageLayout title="API Keys">
            <div className="space-y-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">API Keys</h1>
                        <p className="text-xs text-foreground-muted">Administration · Manage service integrations and API credentials</p>
                    </div>
                    <button onClick={() => { setShowNew(true); setGenerated(null); }}
                        className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">
                        + Generate New Key
                    </button>
                </div>

                {showNew && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-green from-green via-green to-red-500" />
                        <div className="p-5">
                            <p className="text-xs font-bold text-foreground mb-4">Generate New API Key</p>
                            {generated ? (
                                <div className="space-y-3">
                                    <div className="bg-amber/10 border border-amber/30 rounded-lg p-3">
                                        <p className="text-[10px] font-bold text-amber mb-1">Copy this key now — it will not be shown again.</p>
                                        <p className="font-mono text-xs text-foreground break-all">{generated}</p>
                                    </div>
                                    <button onClick={() => { setShowNew(false); setGenerated(null); setNewName(''); setNewService(''); }}
                                        className="px-4 py-2 bg-amber text-white text-xs font-bold rounded-lg">Done</button>
                                </div>
                            ) : (
                                <form onSubmit={handleGenerate} className="flex gap-3 items-end flex-wrap">
                                    <div>
                                        <label className="text-[10px] font-bold text-foreground-muted uppercase block mb-1">Key Name</label>
                                        <input value={newName} onChange={e => setNewName(e.target.value)} required
                                            placeholder="e.g. Production API Key"
                                            className="bg-card-muted border border-border rounded-lg px-3 py-2 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-green/20" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-foreground-muted uppercase block mb-1">Service</label>
                                        <input value={newService} onChange={e => setNewService(e.target.value)} required
                                            placeholder="e.g. SIEM"
                                            className="bg-card-muted border border-border rounded-lg px-3 py-2 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-green/20" />
                                    </div>
                                    <button type="submit" className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Generate</button>
                                    <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-border text-xs font-bold text-foreground-muted rounded-lg">Cancel</button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Key Name', 'Service', 'Created', 'Last Used', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {KEYS.map(k => (
                                    <tr key={k.name} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-3 font-semibold text-foreground">{k.name}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{k.service}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{k.created}</td>
                                        <td className="px-4 py-3 text-foreground-muted">{k.lastUsed}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${k.status === 'Active' ? 'bg-green/10 text-green' : 'bg-card-muted text-foreground-muted'}`}>
                                                {k.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button className="text-[10px] font-bold text-red-500 hover:underline">Revoke</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
