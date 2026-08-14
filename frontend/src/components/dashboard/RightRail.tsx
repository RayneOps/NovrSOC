import { FileText, Zap, Settings, User, Bell, Key, Users, CreditCard, ChevronRight } from 'lucide-react';

interface RightRailProps {
    portal: 'admin' | 'client';
}

function AccountOverviewCard({ base }: { base: string }) {
    return (
        <div className="bg-white border border-grey-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-sm text-grey-800">Account Overview</h3>
                <FileText size={16} className="text-grey-500" />
            </div>
            {/* Placeholder rows — replace with real data when wired */}
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-grey-500">Organisation</span>
                    <span className="font-medium text-grey-800">Cybernovr</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-grey-500">Plan</span>
                    <span className="font-medium text-blue">Enterprise</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-grey-500">Agents Active</span>
                    <span className="font-medium text-grey-800">—</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-grey-500">Clients</span>
                    <span className="font-medium text-grey-800">—</span>
                </div>
            </div>
            <a href={`${base}/settings`} className="block mt-4 text-xs text-blue hover:text-purple transition-colors">
                View Full Account →
            </a>
        </div>
    );
}

function SettingsCard({ portal, base }: { portal: 'admin' | 'client'; base: string }) {
    const adminItems = [
        { label: 'Profile & Account', href: `${base}/settings#profile`, icon: User },
        { label: 'Notifications', href: `${base}/settings#notifications`, icon: Bell },
        { label: 'API Keys', href: `${base}/settings#api`, icon: Key },
        { label: 'Team Members', href: `${base}/settings#team`, icon: Users },
        { label: 'Billing', href: `${base}/settings#billing`, icon: CreditCard },
    ];
    const clientItems = [
        { label: 'Profile', href: `${base}/settings#profile`, icon: User },
        { label: 'Notifications', href: `${base}/settings#notifications`, icon: Bell },
        { label: 'Billing', href: `${base}/billing`, icon: CreditCard },
    ];
    const items = portal === 'admin' ? adminItems : clientItems;

    return (
        <div className="bg-white border border-grey-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-sm text-grey-800">Settings</h3>
                <Settings size={16} className="text-grey-500" />
            </div>
            <div className="space-y-2">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <a
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-grey-800 hover:bg-blue/5 hover:text-blue transition-colors group"
                        >
                            <Icon size={14} className="text-grey-500 group-hover:text-blue transition-colors" />
                            {item.label}
                            <ChevronRight size={12} className="ml-auto text-grey-300 group-hover:text-blue transition-colors" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

function QuickActionsCard({ portal, base }: { portal: 'admin' | 'client'; base: string }) {
    const adminActions = [
        { label: 'Add Organization', href: `${base}/settings` },
        { label: 'Invite User', href: `${base}/settings` },
        { label: 'Run Threat Scan', href: `${base}/threat/webscan` },
        { label: 'View System Status', href: '/status' },
    ];
    const clientActions = [
        { label: 'Run Threat Scan', href: `${base}/threat/webscan` },
        { label: 'View System Status', href: '/status' },
    ];
    const actions = portal === 'admin' ? adminActions : clientActions;

    return (
        <div className="bg-white border border-grey-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-sm text-grey-800">Quick Actions</h3>
                <Zap size={16} className="text-red" />
            </div>
            <p className="text-xs text-grey-500 mb-4">Frequently used administrative tasks.</p>
            <div className="space-y-2">
                {actions.map((action) => (
                    <a
                        key={action.label}
                        href={action.href}
                        className="flex items-center gap-2 text-sm text-grey-800 hover:text-blue transition-colors py-1"
                    >
                        <span className="text-blue font-bold">+</span>
                        {action.label}
                    </a>
                ))}
            </div>
        </div>
    );
}

export function RightRail({ portal }: RightRailProps) {
    const base = portal === 'admin' ? '/admin' : '/client';
    return (
        <div className="space-y-4">
            <AccountOverviewCard base={base} />
            <SettingsCard portal={portal} base={base} />
            <QuickActionsCard portal={portal} base={base} />
        </div>
    );
}
