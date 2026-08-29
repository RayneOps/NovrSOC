'use client';

import { ExternalLink, Briefcase } from 'lucide-react';

// 169.58.242.194 is VPS 6's address per the user's own VPS6_TheHive_Shuffle_Guide.md.
const THEHIVE_URL = process.env.NEXT_PUBLIC_THEHIVE_URL || 'http://169.58.242.194:9000';

export function CasesPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Cases</h1>
                <p className="text-xs text-foreground-muted">Security case management — handled in TheHive, not this platform&apos;s own store.</p>
            </div>

            <div className="bg-card border border-dashed border-grey-300 rounded-xl p-12 text-center">
                <Briefcase size={32} className="text-border mx-auto mb-3" />
                <h2 className="font-bold text-sm text-foreground mb-1">Cases live in TheHive</h2>
                <p className="text-xs text-foreground-muted max-w-md mx-auto mb-5">
                    NovrSOC doesn&apos;t duplicate case data — TheHive is the system of record for every security case once VPS 6&apos;s SOAR stack is deployed and wired in (see SOAR Automation for status). Use Incident Response for this platform&apos;s own incident tracking today.
                </p>
                <a href={THEHIVE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-purple text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-purple-hover transition-colors">
                    Open TheHive <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
}
