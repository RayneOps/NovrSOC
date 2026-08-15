// Base URL of the standalone NovrSOC backend (see /backend). All same-origin `/api/...`
// fetch calls in this app are routed through apiUrl() so the origin lives in one place.
//
// Falls back to the deployed Railway backend, not localhost — so a Vercel build with
// NEXT_PUBLIC_BACKEND_URL unset still works instead of silently trying to call
// localhost:4001 from the browser. Local dev overrides this via frontend/.env.local.
export function apiUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://novrsoc-production.up.railway.app';
    return `${base}${path}`;
}
