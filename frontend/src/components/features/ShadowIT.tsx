'use client';

import { WifiOff } from 'lucide-react';

// Genuinely new — despite the nav spec's "existing (OPNsense)" label, no OPNsense integration
// (route, service, or even a host/credential in .env) exists anywhere in this codebase. Built
// as an honest not-yet-connected placeholder rather than either skipping the nav entry or
// fabricating OPNsense data with nothing real behind it.

export function ShadowIT() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">Shadow IT</h1>
                <p className="text-xs text-foreground-muted">Unsanctioned devices and applications detected on the network via OPNsense.</p>
            </div>

            <div className="bg-card border border-dashed border-grey-300 rounded-xl p-12 text-center">
                <WifiOff size={32} className="text-border mx-auto mb-3" />
                <h2 className="font-bold text-sm text-foreground mb-1">OPNsense not connected</h2>
                <p className="text-xs text-foreground-muted max-w-md mx-auto">
                    No OPNsense integration exists yet — this page has no live data source to show. Once an OPNsense firewall is deployed and its API is reachable from this backend, this page will list unrecognised MAC addresses, unmanaged devices, and unsanctioned outbound traffic detected at the network edge.
                </p>
            </div>
        </div>
    );
}
