// Base URL of the standalone NovrSOC backend (see /backend). All same-origin `/api/...`
// fetch calls in this app are routed through apiUrl() so the origin lives in one place.
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001';

export function apiUrl(path: string): string {
    return `${BASE}${path}`;
}
