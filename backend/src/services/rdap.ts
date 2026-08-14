// RDAP — Domain WHOIS/registrar data
// Free, no key needed
//
// Note: backend/src/lib/dns-intel.ts already has fetchWhois() used by the existing Domain Suite
// (routes/domains.ts). This is a separate, dedicated RDAP client for the new services/ layer.

const RDAP_BASE = 'https://rdap.org';

interface VCardEntry extends Array<unknown> {
    0: string;
    3: string;
}

interface RDAPEntity {
    roles?: string[];
    vcardArray?: [string, VCardEntry[]];
    publicIds?: Array<{ type: string; identifier: string }>;
}

export interface RDAPResponse {
    ldhName: string;
    status: string[];
    events: Array<{ eventAction: string; eventDate: string }>;
    entities: RDAPEntity[];
    nameservers: Array<{ ldhName: string }>;
    secureDNS?: { delegationSigned: boolean };
}

export interface ParsedWhois {
    domain: string;
    registrar: string;
    created: string | null;
    updated: string | null;
    expires: string | null;
    nameservers: string[];
    status: string[];
    dnssec: boolean;
    daysUntilExpiry: number | null;
}

export async function lookupDomain(domain: string): Promise<ParsedWhois | null> {
    try {
        const res = await fetch(`${RDAP_BASE}/domain/${domain}`, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: 'application/json' },
        });

        if (!res.ok) return null;
        const data = (await res.json()) as RDAPResponse;
        return parseRDAP(domain, data);
    } catch {
        return null;
    }
}

function parseRDAP(domain: string, data: RDAPResponse): ParsedWhois {
    const events = data.events || [];
    const getEvent = (action: string) => events.find((e) => e.eventAction === action)?.eventDate ?? null;

    const registrarEntity = data.entities?.find((e) => e.roles?.includes('registrar'));
    const registrar = registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3] ?? 'Unknown';

    const expires = getEvent('expiration');
    const daysUntilExpiry = expires ? Math.floor((new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return {
        domain,
        registrar,
        created: getEvent('registration'),
        updated: getEvent('last changed'),
        expires,
        nameservers: (data.nameservers || []).map((ns) => ns.ldhName.toLowerCase()),
        status: data.status || [],
        dnssec: data.secureDNS?.delegationSigned ?? false,
        daysUntilExpiry,
    };
}
