import { GeneralDashboard } from '@/components/dashboards/GeneralDashboard';

export default function Page() {
    return (
        <div>
            <p className="text-xs font-semibold text-grey-500 uppercase tracking-widest mb-6">
                Aggregated across all onboarded clients
            </p>
            <GeneralDashboard />
        </div>
    );
}
