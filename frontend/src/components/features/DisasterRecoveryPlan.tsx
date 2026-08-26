'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Plus, ChevronDown, HardDrive, Phone, Mail as MailIcon } from 'lucide-react';
import { exportDataAsPDF } from '@/lib/exportPDF';

// Mock data only — no backend route exists for a DRP document yet. The Backup Inventory
// section links out to Data Loss Recovery (components/features/DataLossRecovery.tsx) rather
// than duplicating its live data here.

interface Contact { name: string; role: string; phone: string; email: string; notify_when: string }
interface Runbook { system: string; steps: string[] }

const MOCK_DRP = {
    org: 'Cybernovr',
    rto_hours: 4,
    rpo_hours: 24,
    last_tested: '2026-07-15',
    next_test: '2026-10-15',
    contacts: [
        { name: 'Abubakar Usman', role: 'CEO / Incident Commander', phone: '+234-xxx-xxxx', email: 'rayne@cybernovr.com', notify_when: 'All critical incidents' },
        { name: 'Karl Mensah', role: 'CTO / Technical Lead', phone: '+233-xxx-xxxx', email: 'karl@cybernovr.com', notify_when: 'Technical incidents, data breaches' },
    ] as Contact[],
};

const RUNBOOKS: Runbook[] = [
    { system: 'Web Servers', steps: ['Provision replacement instance from last known-good image', 'Restore application code from Git (main branch)', 'Restore environment variables from encrypted vault', 'Point DNS to new instance, verify TLS', 'Smoke-test critical user flows'] },
    { system: 'Database', steps: ['Identify most recent verified-clean backup', 'Provision new database instance', 'Restore backup, verify row counts against pre-incident snapshot', 'Re-point application connection strings', 'Run integrity checks before reopening to traffic'] },
    { system: 'Email', steps: ['Confirm MX/SPF/DKIM/DMARC records still point correctly', 'Verify SendGrid/Mailgun API keys are valid', 'Send test email to confirm delivery', 'Notify affected users if there was an outage window'] },
    { system: 'Wazuh / Monitoring', steps: ['Restore Wazuh manager and indexer from backup or redeploy', 'Re-enroll agents if manager identity changed', 'Verify alert pipeline end-to-end with a test event', 'Confirm dashboards are receiving live data again'] },
];

export function DisasterRecoveryPlan() {
    const [rto, setRto] = useState(MOCK_DRP.rto_hours);
    const [rpo, setRpo] = useState(MOCK_DRP.rpo_hours);
    const [contacts, setContacts] = useState<Contact[]>(MOCK_DRP.contacts);
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', role: '', phone: '', email: '', notify_when: '' });
    const [openRunbook, setOpenRunbook] = useState<string | null>(RUNBOOKS[0].system);

    const addContact = () => {
        if (!newContact.name || !newContact.email) return;
        setContacts((c) => [...c, newContact]);
        setNewContact({ name: '', role: '', phone: '', email: '', notify_when: '' });
        setShowAddContact(false);
    };

    const exportPlan = () => {
        exportDataAsPDF(`Disaster Recovery Plan — ${MOCK_DRP.org}`, 'disaster-recovery-plan', [
            { heading: 'Recovery Objectives', rows: [
                { label: 'RTO (Recovery Time Objective)', value: `${rto} hours` },
                { label: 'RPO (Recovery Point Objective)', value: `${rpo} hours` },
                { label: 'Last Tested', value: MOCK_DRP.last_tested },
                { label: 'Next Test', value: MOCK_DRP.next_test },
            ] },
            { heading: 'Escalation Contacts', rows: contacts.map((c) => ({ label: c.name, value: `${c.role} · ${c.phone} · ${c.email}` })) },
            { heading: 'Recovery Runbooks', rows: RUNBOOKS.map((r) => ({ label: r.system, value: `${r.steps.length} steps` })) },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-lg font-black text-foreground">Disaster Recovery Plan</h1>
                    <p className="text-xs text-foreground-muted">Data Continuity · Documented recovery procedures, RTO/RPO targets, and escalation contacts for {MOCK_DRP.org}.</p>
                </div>
                <button onClick={exportPlan} className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0">
                    <Download size={14} /> Export Plan PDF
                </button>
            </div>

            {/* 1. Recovery Objectives */}
            <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-semibold text-sm text-foreground mb-1">Recovery Objectives</h3>
                <p className="text-xs text-foreground-muted mb-4">Last tested {MOCK_DRP.last_tested} · Next test {MOCK_DRP.next_test}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-card-muted rounded-lg p-4">
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wide">RTO — Recovery Time Objective</label>
                        <div className="flex items-baseline gap-2 mt-1">
                            <input type="number" value={rto} onChange={(e) => setRto(Number(e.target.value))} min={0}
                                className="w-20 bg-card border border-border rounded-lg px-2 py-1 text-lg font-black text-foreground focus:outline-none focus:border-blue" />
                            <span className="text-sm text-foreground-muted">hours</span>
                        </div>
                        <p className="text-[10px] text-foreground-muted mt-2">How quickly systems must be restored. Benchmark for SMB SOC clients: 4-8 hours.</p>
                    </div>
                    <div className="bg-card-muted rounded-lg p-4">
                        <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wide">RPO — Recovery Point Objective</label>
                        <div className="flex items-baseline gap-2 mt-1">
                            <input type="number" value={rpo} onChange={(e) => setRpo(Number(e.target.value))} min={0}
                                className="w-20 bg-card border border-border rounded-lg px-2 py-1 text-lg font-black text-foreground focus:outline-none focus:border-blue" />
                            <span className="text-sm text-foreground-muted">hours</span>
                        </div>
                        <p className="text-[10px] text-foreground-muted mt-2">How much data loss is acceptable. Should match your backup interval.</p>
                    </div>
                </div>
            </div>

            {/* 2. Escalation Contacts */}
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-semibold text-sm text-foreground">Escalation Contacts</h3>
                    <button onClick={() => setShowAddContact((v) => !v)} className="flex items-center gap-1.5 text-xs font-bold text-blue hover:text-purple transition-colors"><Plus size={12} /> Add Contact</button>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-[10px] font-bold text-foreground-muted uppercase tracking-wide border-b border-border">
                                <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Phone</th><th className="py-2 pr-4">Email</th><th className="py-2">Notify When</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {contacts.map((c, i) => (
                                <tr key={i}>
                                    <td className="py-2 pr-4 font-bold text-foreground whitespace-nowrap">{c.name}</td>
                                    <td className="py-2 pr-4 text-foreground-muted whitespace-nowrap">{c.role}</td>
                                    <td className="py-2 pr-4 text-foreground-muted whitespace-nowrap"><span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span></td>
                                    <td className="py-2 pr-4 text-foreground-muted whitespace-nowrap"><span className="flex items-center gap-1"><MailIcon size={11} />{c.email}</span></td>
                                    <td className="py-2 text-foreground-muted">{c.notify_when}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {showAddContact && (
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact((n) => ({ ...n, name: e.target.value }))} className="border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                        <input placeholder="Role" value={newContact.role} onChange={(e) => setNewContact((n) => ({ ...n, role: e.target.value }))} className="border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                        <input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact((n) => ({ ...n, phone: e.target.value }))} className="border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                        <input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact((n) => ({ ...n, email: e.target.value }))} className="border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground" />
                        <input placeholder="Notify when…" value={newContact.notify_when} onChange={(e) => setNewContact((n) => ({ ...n, notify_when: e.target.value }))} className="border border-border bg-card-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue text-foreground sm:col-span-2" />
                        <button onClick={addContact} className="sm:col-span-2 bg-orange hover:bg-orange-hover text-white text-sm font-bold py-2 rounded-lg transition-colors">Save Contact</button>
                    </div>
                )}
            </div>

            {/* 3. Recovery Runbooks */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-heading font-semibold text-sm text-foreground">Recovery Runbooks</h3>
                </div>
                {RUNBOOKS.map((rb) => (
                    <div key={rb.system} className="border-b border-border last:border-0">
                        <button onClick={() => setOpenRunbook((o) => (o === rb.system ? null : rb.system))}
                            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-card-muted transition-colors">
                            <span className="text-sm font-bold text-foreground">{rb.system}</span>
                            <ChevronDown size={14} className={`text-foreground-muted transition-transform ${openRunbook === rb.system ? 'rotate-180' : ''}`} />
                        </button>
                        {openRunbook === rb.system && (
                            <ol className="px-5 pb-4 space-y-1.5">
                                {rb.steps.map((s, i) => (
                                    <li key={i} className="text-xs text-foreground-muted flex gap-2">
                                        <span className="font-bold text-foreground flex-shrink-0">{i + 1}.</span> {s}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                ))}
            </div>

            {/* 4. Backup Inventory */}
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple/10 flex items-center justify-center flex-shrink-0"><HardDrive size={18} className="text-purple" /></div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Backup Inventory</p>
                        <p className="text-xs text-foreground-muted">What&apos;s backed up, where, and how recently — see Data Loss Recovery for live status.</p>
                    </div>
                </div>
                <Link href="/admin/data/recovery" className="text-xs font-bold text-blue hover:text-purple transition-colors flex-shrink-0">View Data Loss Recovery →</Link>
            </div>
        </div>
    );
}
