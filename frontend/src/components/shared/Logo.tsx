const SIZES = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
} as const;

const IMG_SIZES = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
} as const;

// Brand mark (novrsoc.jpg) for the sidebar and topbar. Distinct from NovrSOCLogo (plain text,
// still used by the status page and available for anywhere a lighter text-only mark is wanted)
// — this is the fuller brand mark for primary chrome. Was a CSS shield-and-dot placeholder
// before the real logo file existed at frontend/public/novrsoc.jpg.
export function Logo({ size = 'md' }: { size?: keyof typeof SIZES }) {
    return (
        <div className={`flex items-center gap-2 ${SIZES[size]}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed small brand mark, not
                a content image; next/image's overhead isn't worth it here. */}
            <img
                src="/novrsoc.jpg"
                alt="NovrSOC"
                className={`${IMG_SIZES[size]} rounded-lg object-contain flex-shrink-0`}
            />
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
