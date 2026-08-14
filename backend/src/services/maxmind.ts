// MaxMind GeoLite2 — local IP geolocation database
// No external API calls — reads a local .mmdb file
// Download database: npm run geoip:download

import * as maxmind from 'maxmind';
import * as fs from 'fs';
import * as path from 'path';

// Resolves to backend/geoip/GeoLite2-City.mmdb whether running via `tsx` from src/ (dev) or
// compiled `dist/` (prod) — see the note in backend/.env next to MAXMIND_LICENSE_KEY for why
// MAXMIND_DB_PATH is deliberately left unset rather than hardcoded to an absolute path.
function defaultDbPath(): string {
    return path.join(__dirname, '../../geoip/GeoLite2-City.mmdb');
}

function dbPath(): string {
    return process.env.MAXMIND_DB_PATH || defaultDbPath();
}

let reader: maxmind.Reader<maxmind.CityResponse> | null = null;
let warnedMissing = false;

async function getReader(): Promise<maxmind.Reader<maxmind.CityResponse> | null> {
    if (reader) return reader;

    try {
        reader = await maxmind.open<maxmind.CityResponse>(dbPath());
        console.log('[MaxMind] GeoLite2-City database loaded');
        return reader;
    } catch {
        // Database not downloaded yet — run npm run geoip:download
        if (!warnedMissing) {
            console.warn('[MaxMind] Database not found — run: npm run geoip:download');
            warnedMissing = true;
        }
        return null;
    }
}

export interface GeoLocation {
    ip: string;
    country_code: string;
    country_name: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
    postal_code: string;
}

export async function lookupIP(ip: string): Promise<GeoLocation | null> {
    const r = await getReader();
    if (!r) return null;

    try {
        const result = r.get(ip);
        if (!result) return null;

        return {
            ip,
            country_code: result.country?.iso_code || '',
            country_name: result.country?.names?.en || '',
            region: result.subdivisions?.[0]?.names?.en || '',
            city: result.city?.names?.en || '',
            latitude: result.location?.latitude || 0,
            longitude: result.location?.longitude || 0,
            timezone: result.location?.time_zone || '',
            postal_code: result.postal?.code || '',
        };
    } catch {
        return null;
    }
}

// Batch lookup
export async function lookupIPBatch(ips: string[]): Promise<Map<string, GeoLocation>> {
    const r = await getReader();
    const results = new Map<string, GeoLocation>();
    if (!r) return results;

    for (const ip of ips) {
        const geo = await lookupIP(ip);
        if (geo) results.set(ip, geo);
    }
    return results;
}

export function isConfigured(): boolean {
    try {
        fs.accessSync(dbPath());
        return true;
    } catch {
        return false;
    }
}
