export function Spinner({ size = 24 }: { size?: number }) {
    return (
        <div
            className="animate-spin rounded-full border-2 border-green border-t-transparent"
            style={{ width: size, height: size }}
            role="status"
            aria-label="Loading"
        />
    );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={`skeleton-shimmer rounded ${className}`} />;
}
