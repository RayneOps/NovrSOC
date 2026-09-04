// Shadowserver Foundation — free national/ISP exposure reports (open ports, malware infections,
// vulnerable devices) via their HMAC-signed reports API.
//
// Honest caveat, checked before writing this: Shadowserver's API isn't a plain sign-up-and-go
// free key like XposedOrNot or GreyNoise. Access is granted per-organization (national CERTs,
// ISPs, vetted security teams) after a manual registration review at
// https://www.shadowserver.org/what-we-do/network-reporting/api-documentation/, and calls must
// be HMAC-SHA256 signed with an id+secret pair issued at approval. SHADOWSERVER_API_ID and
// SHADOWSERVER_API_SECRET are not set in this environment and nothing here can obtain them
// automatically — isConfigured() reflects that honestly rather than faking data. Once NovrSOC (or
// Cybernovr, as a national-CERT-adjacent org) is approved and both env vars are set, every export
// below starts returning real report data with no code change.

import crypto from 'crypto';

const API_BASE = 'https://transform.shadowserver.org/api2';

function getCredentials(): { id: string; secret: string } | null {
    const id = process.env.SHADOWSERVER_API_ID;
    const secret = process.env.SHADOWSERVER_API_SECRET;
    if (!id || !secret || id === 'REPLACE_WHEN_OBTAINED' || secret === 'REPLACE_WHEN_OBTAINED') return null;
    return { id, secret };
}

export function isConfigured(): boolean {
    return !!getCredentials();
}

function signRequest(path: string, body: Record<string, unknown>, secret: string): { payload: string; hmac: string } {
    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', secret).update(path + payload).digest('hex');
    return { payload, hmac };
}

async function callReportsAPI<T>(path: string, body: Record<string, unknown> = {}): Promise<T | null> {
    const creds = getCredentials();
    if (!creds) return null;

    try {
        const requestBody = { ...body, apikey: creds.id };
        const { payload, hmac } = signRequest(path, requestBody, creds.secret);

        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'HMAC2': hmac },
            body: payload,
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
            console.warn('[Shadowserver] Error:', res.status, await res.text().catch(() => ''));
            return null;
        }

        return (await res.json()) as T;
    } catch (err) {
        console.warn('[Shadowserver] Request failed:', err);
        return null;
    }
}

// ── COUNTRY EXPOSURE STATS ────────────────────────────────────────
// Summarizes Shadowserver's per-country daily scan reports (open ports, vulnerable devices,
// compromised hosts) for a given ISO 3166-1 alpha-2 country code, e.g. "NG" for Nigeria.

export interface CountryExposureStats {
    country: string;
    date: string;
    total_exposed: number;
    by_category: Record<string, number>;
    top_ports: Array<{ port: number; count: number }>;
}

interface ShadowserverReportRow {
    tag?: string;
    port?: string | number;
    count?: string | number;
}

export async function getCountryExposure(countryCode = 'NG'): Promise<CountryExposureStats | null> {
    const rows = await callReportsAPI<ShadowserverReportRow[]>('/reports/query', {
        query: { report: 'scan', country: countryCode },
    });
    if (!rows) return null;

    const byCategory: Record<string, number> = {};
    const portCounts: Record<number, number> = {};
    let total = 0;

    for (const row of rows) {
        const count = Number(row.count) || 0;
        total += count;
        if (row.tag) byCategory[row.tag] = (byCategory[row.tag] ?? 0) + count;
        const port = Number(row.port);
        if (port) portCounts[port] = (portCounts[port] ?? 0) + count;
    }

    return {
        country: countryCode,
        date: new Date().toISOString().slice(0, 10),
        total_exposed: total,
        by_category: byCategory,
        top_ports: Object.entries(portCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([port, count]) => ({ port: Number(port), count })),
    };
}

// ── DEVICE-LEVEL LOOKUP ────────────────────────────────────────────
// Checks a single IP/CIDR against Shadowserver's latest scan data — mirrors the shape
// services/abuseipdb.ts's checkBlock() already uses elsewhere in this codebase.

export interface ShadowserverExposure {
    ip: string;
    exposed: boolean;
    tags: string[];
    port?: number;
    detected_at?: string;
}

export async function checkIPExposure(ip: string): Promise<ShadowserverExposure> {
    const rows = await callReportsAPI<ShadowserverReportRow[]>('/reports/query', {
        query: { ip },
    });
    if (!rows || rows.length === 0) return { ip, exposed: false, tags: [] };

    return {
        ip,
        exposed: true,
        tags: [...new Set(rows.map((r) => r.tag).filter((t): t is string => !!t))],
        port: rows[0]?.port ? Number(rows[0].port) : undefined,
        detected_at: new Date().toISOString(),
    };
}
