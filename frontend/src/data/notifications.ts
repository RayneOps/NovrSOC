export type NotifType = 'critical' | 'warning' | 'info';

export interface Notification {
    id: number | string;
    type: NotifType;
    title: string;
    description: string;
    time: string;
    read: boolean;
}

export const TYPE_CONFIG: Record<NotifType, {
    border: string;
    unreadBg: string;
    badge: string;
    label: string;
    dot: string;
    ring: string;
}> = {
    critical: {
        border:   'border-l-red-500',
        unreadBg: 'bg-red-500/60',
        badge:    'bg-red-500/10 text-red-500',
        label:    'Critical',
        dot:      'bg-red-500',
        ring:     'border-red-500/30',
    },
    warning: {
        border:   'border-l-amber-500',
        unreadBg: 'bg-amber/10/50',
        badge:    'bg-amber/10 text-amber',
        label:    'Warning',
        dot:      'bg-amber',
        ring:     'border-amber/30',
    },
    info: {
        border:   'border-l-blue-500',
        unreadBg: 'bg-green/10/40',
        badge:    'bg-green/10 text-green',
        label:    'Info',
        dot:      'bg-green',
        ring:     'border-green/30',
    },
};
