// Free breach-checking, replacing the paid HaveIBeenPwned dependency (services/hibp.ts,
// $3.50/month) for executive email breach monitoring.
//
// Both sources verified live against their real endpoints before writing this, not assumed from
// documentation:
// - XposedOrNot really works, no key, but its response shape differs from what a first guess
//   would produce: a breach hit is `{"breaches":[[...names]],"email":...,"status":"success"}`
//   (breaches is an array containing ONE array of name strings) and a clean email is HTTP 200
//   (not 404) with `{"Error":"Not found","email":null}`.
// - BreachDirectory's public API (breachdirectory.org/api.php) is blocked by a Cloudflare bot
//   challenge for any plain server-side fetch — confirmed live: every request gets HTTP 403 and
//   an interstitial HTML "Just a moment..." page, not JSON, regardless of headers. It's kept
//   here (rather than deleted) because the block could be IP/pattern-specific and might not
//   affect every deployment the same way, but it should be expected to report `error:
//   'blocked'` in practice, not real data — this is not a working integration today.

export interface BreachCheckResult {
    breached: boolean;
    breaches: string[];
    source: string;
    error?: string;
}

export async function checkXposedOrNot(email: string): Promise<BreachCheckResult> {
    try {
        const r = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, {
            signal: AbortSignal.timeout(8000),
        });
        const data = await r.json();
        // A miss is HTTP 200 with {"Error":"Not found"} — not a 404 — so the real signal is
        // whether `breaches` came back at all, not the status code.
        if (!Array.isArray(data?.breaches) || data.breaches.length === 0) {
            return { breached: false, breaches: [], source: 'xposedornot' };
        }
        const names: string[] = Array.isArray(data.breaches[0]) ? data.breaches[0] : [];
        return { breached: names.length > 0, breaches: names, source: 'xposedornot' };
    } catch (err) {
        return { breached: false, breaches: [], source: 'xposedornot', error: err instanceof Error ? err.message : 'unreachable' };
    }
}

export async function checkBreachDirectory(email: string): Promise<BreachCheckResult> {
    try {
        const r = await fetch(`https://breachdirectory.org/api.php?func=auto&term=${encodeURIComponent(email)}`, {
            headers: { 'User-Agent': 'NovrSOC/1.0' },
            signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
            // Confirmed live: this is the normal case (403 + Cloudflare challenge HTML), not an
            // edge case — see the file header.
            return { breached: false, breaches: [], source: 'breachdirectory', error: `blocked (HTTP ${r.status})` };
        }
        const data = await r.json();
        const sources: string[] = Array.isArray(data?.result) ? data.result.map((r: { line?: string }) => r.line).filter(Boolean) : [];
        return { breached: (data?.found ?? 0) > 0, breaches: sources, source: 'breachdirectory' };
    } catch (err) {
        return { breached: false, breaches: [], source: 'breachdirectory', error: err instanceof Error ? err.message : 'unreachable' };
    }
}

// Combined check — runs both in parallel, same as the two-source pattern already established
// elsewhere in this codebase (e.g. services/iocEnrichment.ts's Promise.allSettled fan-out).
export async function checkEmailBreach(email: string): Promise<{
    breached: boolean;
    breach_count: number;
    sources: string[];
    details: BreachCheckResult[];
}> {
    const [xon, bd] = await Promise.allSettled([checkXposedOrNot(email), checkBreachDirectory(email)]);

    const xonResult = xon.status === 'fulfilled' ? xon.value : { breached: false, breaches: [], source: 'xposedornot', error: 'failed' };
    const bdResult = bd.status === 'fulfilled' ? bd.value : { breached: false, breaches: [], source: 'breachdirectory', error: 'failed' };

    const allBreaches = [...xonResult.breaches, ...bdResult.breaches];

    return {
        breached: xonResult.breached || bdResult.breached,
        breach_count: new Set(allBreaches).size,
        sources: [...new Set(allBreaches)],
        details: [xonResult, bdResult],
    };
}
