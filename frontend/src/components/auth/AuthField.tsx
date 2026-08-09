import type { InputHTMLAttributes } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: boolean;
}

export function AuthField({ label, error, className, ...props }: AuthFieldProps) {
    return (
        <div>
            <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider block mb-1.5">
                {label}
            </label>
            <input
                {...props}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-colors ${
                    error ? 'border-red' : 'border-border'
                } ${className ?? ''}`}
            />
        </div>
    );
}
