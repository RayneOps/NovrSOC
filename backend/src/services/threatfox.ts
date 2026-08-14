// ThreatFox — Malware C2 indicators, IOC database
// Abuse.ch project — shares THREATFOX_API_KEY with services/urlhaus.ts

const THREATFOX_BASE = 'https://threatfox-api.abuse.ch/api/v1';
const KEY = process.env.THREATFOX_API_KEY ?? '';

export interface ThreatFoxIOC {
    id: string;
    ioc: string;
    ioc_type: string;       // ip:port | domain | url | md5_hash | sha256_hash
    threat_type: string;    // botnet_cc | payload | payload_delivery
    threat_type_desc: string;
    malware: string;
    malware_printable: string;
    malware_alias: string | null;
    malware_malpedia: string | null;
    confidence_level: number; // 0-100
    first_seen: string;
    last_seen: string | null;
    reporter: string;
    reference: string | null;
    tags: string[] | null;
}

interface ThreatFoxResponse {
    query_status: string;
    data: ThreatFoxIOC[] | string;
}

async function threatfoxPost(body: Record<string, unknown>): Promise<ThreatFoxIOC[]> {
    try {
        const res = await fetch(THREATFOX_BASE, {
            method: 'POST',
            headers: { 'Auth-Key': KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as ThreatFoxResponse;
        if (data.query_status !== 'ok' || !Array.isArray(data.data)) return [];
        return data.data;
    } catch {
        return [];
    }
}

// Search IOCs by value
export async function threatfoxSearchIOC(ioc: string): Promise<ThreatFoxIOC[]> {
    return threatfoxPost({ query: 'search_ioc', search_term: ioc });
}

// Get recent IOCs (last N days)
export async function threatfoxGetRecent(days = 1): Promise<ThreatFoxIOC[]> {
    return threatfoxPost({ query: 'get_iocs', days });
}

// Search by malware family name
export async function threatfoxSearchMalware(malwareName: string): Promise<ThreatFoxIOC[]> {
    return threatfoxPost({ query: 'search_malware', malware_search: malwareName });
}
