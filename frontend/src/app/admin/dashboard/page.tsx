import { GeneralDashboard } from '@/components/dashboards/GeneralDashboard';

export default function Page() {
    return (
        <div>
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-black text-xl text-foreground tracking-tight">
                            Security Operations Centre
                        </h1>
                        <p className="text-xs text-foreground-muted mt-0.5 uppercase tracking-wider font-medium">
                            Aggregated across all onboarded clients
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-green-700">Telemetry Online</span>
                    </div>
                </div>
            </div>
            <GeneralDashboard />
        </div>
    );
}
