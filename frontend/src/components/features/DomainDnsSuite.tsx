'use client';

import { useState } from 'react';
import { Globe, Network } from 'lucide-react';
import { DomainSuite } from './DomainSuite';
import { DnsSuite } from './DnsSuite';

// Combined entry point for Domain Suite and DNS Suite — same pattern as UrlWebScanner.tsx's
// merge of the URL/website scanners. Both underlying pages/components are untouched and still
// reachable directly at their original routes; this just gives them one shared home with a tab
// switch, since they're closely related (both are domain-facing brand/infra monitoring) but
// cover different concerns (brand domain lookalikes/typosquats vs. DNS record health).
const TABS = [
    { id: 'domain', label: 'Domain Suite', icon: Globe },
    { id: 'dns', label: 'DNS Suite', icon: Network },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function DomainDnsSuite() {
    const [activeTab, setActiveTab] = useState<TabId>('domain');

    return (
        <div className="space-y-4">
            <div className="flex gap-1 bg-card-muted rounded-lg p-1 w-fit">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                activeTab === tab.id ? 'bg-card text-blue shadow-sm' : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            <Icon size={13} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'domain' ? <DomainSuite /> : <DnsSuite />}
        </div>
    );
}
