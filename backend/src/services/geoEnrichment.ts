import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface EnrichedGeoData {
  ip: string;
  country: string;
  country_code: string;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  asn: string | null;
  org: string | null;
  source: 'IPregistry' | 'AFRINIC' | 'RIPE' | 'Unknown';
  is_nigerian: boolean;
}

// 1. Supabase Client Initializer
let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

// 2. Source 1: IPregistry Enrichment
async function fetchFromIPRegistry(ip: string): Promise<Partial<EnrichedGeoData> | null> {
  const apiKey = process.env.IPREGISTRY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.ipregistry.co/${ip}?key=${apiKey}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    return {
      country: data.location?.country?.name || 'Unknown',
      country_code: data.location?.country?.code || '',
      region: data.location?.region?.name || null,
      city: data.location?.city || null,
      latitude: data.location?.latitude || null,
      longitude: data.location?.longitude || null,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
      org: data.connection?.organization || null,
      source: 'IPregistry',
      is_nigerian: data.location?.country?.code === 'NG',
    };
  } catch {
    return null;
  }
}

// 3. Source 2: AFRINIC RDAP / Whois
async function fetchFromAFRINIC(ip: string): Promise<Partial<EnrichedGeoData> | null> {
  try {
    const res = await fetch(`https://rdap.afrinic.net/rdap/ip/${ip}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const country = data.country || 'NG';
    const name = data.name || data.handle || '';

    return {
      country: country === 'NG' ? 'Nigeria' : country,
      country_code: country,
      region: null,
      city: null,
      org: name,
      source: 'AFRINIC',
      is_nigerian: country === 'NG',
    };
  } catch {
    return null;
  }
}

// 4. Source 3: RIPE Stat API
async function fetchFromRipeStat(ip: string): Promise<Partial<EnrichedGeoData> | null> {
  try {
    const res = await fetch(`https://stat.ripe.net/data/geoloc/data.json?resource=${ip}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const loc = data?.data?.locations?.[0];
    if (!loc) return null;

    return {
      country: loc.country === 'NG' ? 'Nigeria' : loc.country,
      country_code: loc.country || '',
      city: loc.city || null,
      latitude: loc.latitude || null,
      longitude: loc.longitude || null,
      source: 'RIPE',
      is_nigerian: loc.country === 'NG',
    };
  } catch {
    return null;
  }
}

// Master Single IP Enricher: Fallthrough Chain
export async function enrichIP(ip: string): Promise<EnrichedGeoData> {
  // Try IPregistry primary
  let result = await fetchFromIPRegistry(ip);

  // Fallback to AFRINIC for African netblocks
  if (!result || !result.country_code) {
    result = await fetchFromAFRINIC(ip);
  }

  // Fallback to RIPE Stat
  if (!result || !result.country_code) {
    result = await fetchFromRipeStat(ip);
  }

  return {
    ip,
    country: result?.country || 'Unknown',
    country_code: result?.country_code || 'XX',
    region: result?.region || null,
    city: result?.city || null,
    latitude: result?.latitude || null,
    longitude: result?.longitude || null,
    asn: result?.asn || null,
    org: result?.org || null,
    source: (result?.source as any) || 'Unknown',
    is_nigerian: result?.is_nigerian || result?.country_code === 'NG',
  };
}

// Batch Enricher with Concurrency Limiter
export async function enrichIPBatch(ips: string[]): Promise<Map<string, EnrichedGeoData>> {
  const uniqueIps = Array.from(new Set(ips));
  const results = new Map<string, EnrichedGeoData>();

  // Process in chunks of 5 parallel requests
  const chunkSize = 5;
  for (let i = 0; i < uniqueIps.length; i += chunkSize) {
    const chunk = uniqueIps.slice(i, i + chunkSize);
    const settled = await Promise.all(chunk.map((ip) => enrichIP(ip)));
    settled.forEach((data) => results.set(data.ip, data));
  }

  return results;
}