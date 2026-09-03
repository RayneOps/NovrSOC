import { Landmark } from 'lucide-react';
import { ComingSoonPage } from '@/components/features/ComingSoonPage';

export default function Page() {
    return (
        <ComingSoonPage
            icon={Landmark}
            title="CBN Advisories"
            subtitle="Nigerian Threat Intel · Central Bank of Nigeria cybersecurity advisories"
            message="Coming soon — CBN advisory integration in progress."
        />
    );
}
