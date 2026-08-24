'use client';

import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { MOCK_TEAM, ROLE_BADGES, ROLE_LABELS, type TeamRole } from '@/lib/mockTeam';

export default function TeamPage() {
    const [search, setSearch] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<TeamRole>('analyst');

    const filtered = MOCK_TEAM.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black text-foreground">Team Members</h1>
                    <p className="text-xs text-foreground-muted">Administration · Manage analyst access and permissions</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 bg-orange hover:bg-orange-hover text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                    <UserPlus size={14} />
                    Invite Member
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full max-w-sm pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-card
                               focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/10"
                />
            </div>

            {/* Team table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-foreground">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white">Member</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white">Last Active</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-xs text-foreground-muted">
                                    No team members match &ldquo;{search}&rdquo;.
                                </td>
                            </tr>
                        ) : filtered.map((user, i) => (
                            <tr
                                key={user.id}
                                className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-card' : 'bg-card-muted'} hover:bg-[#F0F4FF] transition-colors`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                            {user.avatar}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-foreground">{user.name}</div>
                                            <div className="text-xs text-foreground-muted">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${ROLE_BADGES[user.role]}`}>
                                        {ROLE_LABELS[user.role]}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                        user.status === 'active' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                                    }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-foreground-muted">{user.last_seen}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button className="text-xs text-purple hover:underline font-medium">Edit</button>
                                        {user.role !== 'super_admin' && (
                                            <button className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-foreground-muted">
                Showing mock roster data — wire to a real user table once one exists. Role changes and Edit/Remove are not yet persisted.
            </p>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-bold text-base text-foreground">Invite Team Member</h2>
                            <button onClick={() => setShowInviteModal(false)} className="text-foreground-muted hover:text-foreground" aria-label="Close">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email" value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card
                                               focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/10"
                                    placeholder="analyst@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                                    Role
                                </label>
                                <select
                                    value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card focus:outline-none focus:border-purple"
                                >
                                    <option value="analyst">SOC Analyst — can view and action alerts</option>
                                    <option value="viewer">Viewer — read-only access</option>
                                    <option value="super_admin">Super Admin — full platform access</option>
                                </select>
                            </div>
                            <div className="bg-[#F5F0FF] rounded-lg p-3 text-xs text-purple">
                                An invitation email will be sent to this address with a secure join link.
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                            <button onClick={() => setShowInviteModal(false)} className="text-sm text-foreground-muted px-4 py-2 rounded-lg hover:bg-card-muted">
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="text-sm font-bold bg-orange hover:bg-orange-hover text-white px-5 py-2 rounded-lg transition-colors"
                            >
                                Send Invitation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
