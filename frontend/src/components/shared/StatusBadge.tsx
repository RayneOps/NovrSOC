export const StatusBadge = ({ value }: { value: string }) => {
    const n = value.toLowerCase();

    let ring = 'bg-card-muted text-foreground-muted border-border';
    let dot  = 'bg-grey-500';

    if (['critical', 'high'].includes(n)) {
        ring = 'bg-red/10 text-red border-red/30';
        dot  = 'bg-red';
    } else if (['medium', 'investigating', 'triaging', 'warning', 'pending'].includes(n)) {
        ring = 'bg-amber/10 text-amber border-amber/30';
        dot  = 'bg-amber';
    } else if (['low', 'mitigated', 'isolated', 'improving', 'stable', 'healthy', 'compliant', 'resolved', 'operational', 'active', 'online'].includes(n)) {
        ring = 'bg-green/10 text-green border-green/30';
        dot  = 'bg-green';
    } else if (['queued', 'archived'].includes(n)) {
        ring = 'bg-card-muted text-foreground-muted border-border';
        dot  = 'bg-grey-500';
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            {value}
        </span>
    );
};
