const SIZES = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
} as const;

// Icon-mark logo (shield + orange dot) for the sidebar and topbar. Distinct from
// NovrSOCLogo (plain text, still used by the status page and available for anywhere a
// lighter text-only mark is wanted) — this is the fuller brand mark for primary chrome.
export function Logo({ size = 'md' }: { size?: keyof typeof SIZES }) {
    return (
        <div className={`flex items-center gap-2 ${SIZES[size]}`}>
            <div className="relative flex-shrink-0">
                <div className="w-7 h-7 bg-purple rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white rounded-sm" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-orange rounded-full border-2 border-white" />
            </div>
            <div>
                <div className="font-black text-foreground leading-none tracking-tight">
                    NovrSOC
                </div>
                <div className="text-[9px] text-foreground-muted leading-none font-medium tracking-wider uppercase">
                    by Cybernovr
                </div>
            </div>
        </div>
    );
}
