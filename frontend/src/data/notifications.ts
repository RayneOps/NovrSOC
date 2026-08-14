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
        unreadBg: 'bg-grey-100/10/50',
        badge:    'bg-grey-100/10 text-amber',
        label:    'Warning',
        dot:      'bg-grey-100',
        ring:     'border-amber/30',
    },
    info: {
        border:   'border-l-blue-500',
        unreadBg: 'bg-blue/10/40',
        badge:    'bg-blue/10 text-blue',
        label:    'Info',
        dot:      'bg-blue',
        ring:     'border-blue/30',
    },
};
