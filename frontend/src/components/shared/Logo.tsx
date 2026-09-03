// novrsoc.jpg is the full wordmark — "NOVRSOC" styled as a graphic with "by CYBERNOVR"
// underneath, baked into the image itself (632×233px, a ~2.7:1 rectangle). It was previously
// force-fit into a small square box (w-8 h-8 etc.) with a separate "NovrSOC / by Cybernovr"
// text label bolted on next to it to compensate — that cropped the wordmark down to an
// unreadable sliver and duplicated text the image already has. Sized by height only now, so it
// renders at its real aspect ratio, and the redundant text label is gone.
const HEIGHTS = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-14',
} as const;

export function Logo({ size = 'md' }: { size?: keyof typeof HEIGHTS }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element -- fixed small brand mark, not a
        // content image; next/image's overhead isn't worth it here.
        <img
            src="/novrsoc.jpg"
            alt="NovrSOC by Cybernovr"
            className={`${HEIGHTS[size]} w-auto object-contain flex-shrink-0`}
        />
    );
}
