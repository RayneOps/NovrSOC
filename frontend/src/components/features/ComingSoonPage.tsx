import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

interface ComingSoonPageProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    message: string;
}

// Shared shell for a nav destination that's real (it's in the sidebar, it's not a 404) but
// whose actual data integration isn't built yet — honest about that instead of a broken link
// or, worse, a page full of fabricated data. Used by CBN/NCC Advisories and Threat Actors today.
export function ComingSoonPage({ icon, title, subtitle, message }: ComingSoonPageProps) {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-black text-foreground">{title}</h1>
                <p className="text-xs text-foreground-muted">{subtitle}</p>
            </div>
            <div className="bg-card border border-border rounded-xl">
                <EmptyState icon={icon} title="Coming soon" description={message} />
            </div>
        </div>
    );
}
