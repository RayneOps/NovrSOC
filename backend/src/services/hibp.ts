// HaveIBeenPwned API v3 — executive email breach checking
// $3.50/month — get at: haveibeenpwned.com/API/Key
// Set: HIBP_API_KEY=...

function getKey(): string | null {
    const key = process.env.HIBP_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export interface HIBPBreach {
    Name: string;
    Title: string;
    Domain: string;
    BreachDate: string;
    AddedDate: string;
    DataClasses: string[];
    IsVerified: boolean;
    IsSensitive: boolean;
}

export async function checkEmail(email: string): Promise<HIBPBreach[]> {
    const key = getKey();
    if (!key) return [];

    try {
        const res = await fetch(
            `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
            { headers: { 'hibp-api-key': key, 'User-Agent': 'NovrSOC-Platform' }, signal: AbortSignal.timeout(8000) }
        );

        if (res.status === 404) return []; // not found = not breached
        if (res.status === 401) {
            console.error('[HIBP] Invalid API key');
            return [];
        }
        if (res.status === 429) {
            console.warn('[HIBP] Rate limited');
            return [];
        }
        if (!res.ok) return [];

        return (await res.json()) as HIBPBreach[];
    } catch {
        return [];
    }
}

export function isConfigured(): boolean {
    return !!getKey();
}
