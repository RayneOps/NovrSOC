'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';

const USERS = [
    { id: 'USR-001', name: 'Amaka Obi', email: 'a.obi@cybernovr.com', role: 'SOC Analyst', status: 'Active', lastLogin: 'Today 14:21', mfa: true, avatar: 'AO' },
    { id: 'USR-002', name: 'Chidi Nwosu', email: 'c.nwosu@cybernovr.com', role: 'SOC Lead', status: 'Active', lastLogin: 'Today 13:45', mfa: true, avatar: 'CN' },
    { id: 'USR-003', name: 'Tunde Adeyemi', email: 't.adeyemi@cybernovr.com', role: 'SOC Analyst', status: 'Active', lastLogin: 'Today 12:00', mfa: true, avatar: 'TA' },
    { id: 'USR-004', name: 'Fatima Bello', email: 'f.bello@cybernovr.com', role: 'Threat Intelligence', status: 'Active', lastLogin: 'Today 11:30', mfa: false, avatar: 'FB' },
    { id: 'USR-005', name: 'Emeka Okafor', email: 'e.okafor@cybernovr.com', role: 'SOAR Engineer', status: 'Active', lastLogin: 'Yesterday', mfa: true, avatar: 'EO' },
    { id: 'USR-006', name: 'Ngozi Adeleke', email: 'n.adeleke@cybernovr.com', role: 'Compliance Officer', status: 'Active', lastLogin: '3 days ago', mfa: true, avatar: 'NA' },
    { id: 'USR-007', name: 'Ibrahim Musa', email: 'i.musa@cybernovr.com', role: 'Admin', status: 'Active', lastLogin: 'Today 09:00', mfa: true, avatar: 'IM' },
    { id: 'USR-008', name: 'Chioma Eze', email: 'c.eze@cybernovr.com', role: 'SOC Analyst', status: 'Inactive', lastLogin: '2 weeks ago', mfa: false, avatar: 'CE' },
];

const ROLES = [
    { name: 'Admin', desc: 'Full platform access — users, settings, subscriptions, API keys', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
    { name: 'SOC Lead', desc: 'Manage analysts, escalate incidents, create playbooks', color: 'bg-green/10 text-green border-green/30' },
    { name: 'SOC Analyst', desc: 'Triage alerts, manage cases, run threat hunts', color: 'bg-green/10 text-green border-green/30' },
    { name: 'Threat Intelligence', desc: 'IOC feeds, advisories, campaign tracking, threat actors', color: 'bg-amber/10 text-amber border-amber/30' },
    { name: 'SOAR Engineer', desc: 'Build and manage playbooks, automation rules', color: 'bg-green/10 text-green border-green/30' },
    { name: 'Compliance Officer', desc: 'View compliance dashboards and audit reports — read-only', color: 'bg-card-muted text-foreground-muted border-border' },
];

const ROLE_BADGE: Record<string, string> = {
    Admin: 'bg-red-500/10 text-red-500 border border-red-500/30',
    'SOC Lead': 'bg-green/10 text-green border border-green/30',
    'SOC Analyst': 'bg-green/10 text-green border border-green/30',
    'Threat Intelligence': 'bg-amber/10 text-amber border border-amber/30',
    'SOAR Engineer': 'bg-green/10 text-green border border-green/30',
    'Compliance Officer': 'bg-card-muted text-foreground-muted border border-border',
};

export default function UsersPage() {
    const [showInvite, setShowInvite] = useState(false);
    const [showRoles, setShowRoles] = useState(false);

    return (
        <PageLayout title="Users & Roles">
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-black text-foreground">Users & Roles</h1>
                        <p className="text-xs text-foreground-muted">Administration · Manage platform users, roles, and permissions</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowRoles(true)} className="px-4 py-2 border border-border text-foreground-muted text-xs font-bold rounded-lg hover:bg-card-muted transition-colors">View Roles</button>
                        <button onClick={() => setShowInvite(true)} className="px-4 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">+ Invite User</button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Total Users', v: USERS.length, color: 'text-foreground' },
                        { label: 'Active', v: USERS.filter(u => u.status === 'Active').length, color: 'text-green' },
                        { label: 'MFA Enabled', v: USERS.filter(u => u.mfa).length, color: 'text-green' },
                        { label: 'No MFA', v: USERS.filter(u => !u.mfa).length, color: 'text-amber' },
                    ].map(k => (
                        <div key={k.label} className="bg-card border border-border rounded-xl p-3">
                            <div className="h-[3px] bg-green from-green via-green to-red-500 -mt-3 -mx-3 mb-2 rounded-t-xl" />
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-wider">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{k.v}</p>
                        </div>
                    ))}
                </div>

                {/* Users table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-green from-green via-green to-red-500" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border">
                                    {['User', 'Role', 'Status', 'MFA', 'Last Login', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {USERS.map(u => (
                                    <tr key={u.id} className="border-b border-border hover:bg-card-muted transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-green from-green to-green flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                                                    {u.avatar}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{u.name}</p>
                                                    <p className="text-[10px] text-foreground-muted font-mono">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ROLE_BADGE[u.role] ?? ''}`}>{u.role}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold ${u.status === 'Active' ? 'text-green' : 'text-foreground-muted'}`}>
                                                {u.status === 'Active' ? '🟢 Active' : '⚪ Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.mfa ? <span className="text-green font-bold text-[10px]">✅ Enabled</span> : <span className="text-amber font-bold text-[10px]">⚠ Disabled</span>}
                                        </td>
                                        <td className="px-4 py-3 text-foreground-muted">{u.lastLogin}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button className="text-[10px] font-bold text-green hover:underline">Edit</button>
                                                <button className="text-[10px] font-bold text-foreground-muted hover:text-red-500">Disable</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 rounded-t-2xl" />
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-foreground">Invite New User</h3>
                                <button onClick={() => setShowInvite(false)} className="text-foreground-muted hover:text-foreground-muted">✕</button>
                            </div>
                            <div className="space-y-3">
                                {['Full Name', 'Email Address'].map(f => (
                                    <div key={f}>
                                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">{f}</label>
                                        <input type={f.includes('Email') ? 'email' : 'text'} placeholder={`${f}…`}
                                            className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green/20" />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block mb-1">Role</label>
                                    <select className="w-full bg-card-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none">
                                        {ROLES.map(r => <option key={r.name}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <p className="text-[10px] text-foreground-muted mt-3">An invitation email will be sent to the user with MFA setup instructions.</p>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowInvite(false)} className="flex-1 py-2 border border-border text-foreground-muted text-xs font-bold rounded-lg hover:bg-card-muted transition-colors">Cancel</button>
                                <button onClick={() => setShowInvite(false)} className="flex-1 py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Send Invite</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Roles Modal */}
            {showRoles && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl">
                        <div className="h-[3px] bg-green from-green via-green to-red-500 rounded-t-2xl" />
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-foreground">Role Definitions</h3>
                                <button onClick={() => setShowRoles(false)} className="text-foreground-muted hover:text-foreground-muted">✕</button>
                            </div>
                            <div className="space-y-3">
                                {ROLES.map(r => (
                                    <div key={r.name} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${r.color}`}>{r.name}</span>
                                        <p className="text-[11px] text-foreground-muted">{r.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowRoles(false)} className="mt-5 w-full py-2 bg-red hover:bg-red-hover text-white text-xs font-bold rounded-lg transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
