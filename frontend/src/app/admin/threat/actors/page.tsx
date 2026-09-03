import { Users } from 'lucide-react';
import { ComingSoonPage } from '@/components/features/ComingSoonPage';

export default function Page() {
    return (
        <ComingSoonPage
            icon={Users}
            title="Threat Actors"
            subtitle="Global Threat Intel · Tracked threat actor groups, TTPs, and campaign attribution"
            message="Coming soon — threat actor profile integration in progress."
        />
    );
}
