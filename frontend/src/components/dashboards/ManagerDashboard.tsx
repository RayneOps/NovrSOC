import { KpiCard } from '../shared/KpiCard';
import { ChartWrapper } from '../shared/ChartWrapper';
import { DataTable } from '../shared/DataTable';
import { StatusBadge } from '../shared/StatusBadge';
import { globalMetrics, operationsQueueData } from '@/data/mockData';

export const ManagerDashboard = () => {
    const data = globalMetrics.socManager;
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.values(data).map((kpi, idx) => (
                    <KpiCard key={idx} {...kpi} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ChartWrapper title="Daily Queue Intake Velocity & Ingestion Load">
                        <div className="w-full h-full flex items-end gap-1.5 pt-4">
                            {[30, 45, 35, 70, 60, 50, 80, 95, 110, 85, 65, 40].map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center group">
                                    <div
                                        className="w-full bg-blue rounded-t opacity-70 group-hover:opacity-100 transition-all duration-200"
                                        style={{ height: `${val / 1.1}%` }}
                                    />
                                    <span className="text-[9px] text-foreground-muted mt-1.5 font-medium">{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </ChartWrapper>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <h3 className="font-bold text-foreground text-[11px] tracking-widest uppercase mb-5">Analyst Workload Distribution</h3>
                    <div className="space-y-5">
                        {[
                            { name: 'Mubarak A.', count: '4 Active Cases', width: '80%', color: 'bg-amber' },
                            { name: 'Brain O.',   count: '3 Active Cases', width: '60%', color: 'bg-blue' },
                        ].map((a, i) => (
                            <div key={i} className="text-xs">
                                <div className="flex justify-between font-semibold mb-1.5">
                                    <span className="text-foreground">{a.name}</span>
                                    <span className="text-foreground-muted">{a.count}</span>
                                </div>
                                <div className="w-full bg-card-muted h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full ${a.color} rounded-full`} style={{ width: a.width }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DataTable
                title="Active Operational Response Queue"
                columns={['Incident Identifier', 'Assigned Specialist', 'Severity Level', 'Workflow Status', 'SLA Clock']}
                data={operationsQueueData}
                renderRow={(row, idx) => (
                    <tr key={idx} className="hover:bg-card-muted transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-foreground">{row.incident}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-foreground">{row.analyst}</td>
                        <td className="px-6 py-4"><StatusBadge value={row.priority} /></td>
                        <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
                        <td className="px-6 py-4 font-mono text-xs text-red-500 font-bold">{row.sla}</td>
                    </tr>
                )}
            />
        </div>
    );
};
