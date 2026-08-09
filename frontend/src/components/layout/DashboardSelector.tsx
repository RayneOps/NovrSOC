'use client';

interface SelectorProps {
    value: string;
    onChange: (val: string) => void;
}

const groups = [
    {
        label: 'Role',
        items: [
            { value: 'General',     label: 'General' },
            { value: 'Executive',   label: 'Executive' },
            { value: 'SOC Manager', label: 'SOC Manager' },
            { value: 'SOC Analyst', label: 'SOC Analyst' },
        ],
    },
    {
        label: 'Service',
        items: [
            { value: 'Threat Intelligence',     label: 'Threat Intel' },
            { value: 'Security Operations',     label: 'Sec Ops' },
            { value: 'Assets & Risk',           label: 'Assets & Risk' },
            { value: 'Exposure Monitoring',     label: 'Exposure' },
            { value: 'Protection & Automation', label: 'Protection' },
        ],
    },
    {
        label: 'Platform',
        items: [
            { value: 'Compliance',            label: 'Compliance' },
            { value: 'SOAR Platform',         label: 'SOAR' },
            { value: 'Reporting Center',      label: 'Reporting' },
            { value: 'Customer Multi-Tenant', label: 'Multi-Tenant' },
            { value: 'NovrAI Command Center', label: 'NovrAI ⚡' },
        ],
    },
];

export const DashboardSelector = ({ value, onChange }: SelectorProps) => {
    return (
        <div className="bg-card border-b border-border relative">
            <div className="flex items-stretch overflow-x-auto scrollbar-none">
                {groups.map((group, gIdx) => (
                    <div key={group.label} className="flex items-stretch flex-shrink-0">
                        {gIdx > 0 && (
                            <div className="w-px bg-border my-2.5 flex-shrink-0" />
                        )}
                        <span className="self-center text-[9px] font-black uppercase tracking-widest text-foreground-muted px-3 select-none flex-shrink-0">
                            {group.label}
                        </span>
                        {group.items.map((item) => {
                            const active = value === item.value;
                            return (
                                <button
                                    key={item.value}
                                    onClick={() => onChange(item.value)}
                                    className={`relative px-4 py-3.5 text-[11px] font-bold tracking-wide whitespace-nowrap transition-all duration-150 border-b-2 flex-shrink-0 ${
                                        active
                                            ? 'text-blue border-blue bg-blue/10'
                                            : 'text-foreground-muted border-transparent hover:text-foreground hover:bg-card-muted'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
