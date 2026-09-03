import { Radio } from 'lucide-react';
import { ComingSoonPage } from '@/components/features/ComingSoonPage';

export default function Page() {
    return (
        <ComingSoonPage
            icon={Radio}
            title="NCC Advisories"
            subtitle="Nigerian Threat Intel · Nigerian Communications Commission CSIRT advisories"
            message="Coming soon — NCC-CSIRT advisory integration in progress."
        />
    );
}
