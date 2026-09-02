// TheHive — SOAR case management (VPS 6, Phase 2 per NovrSOC_WazuhMigration_ContaboSQL.md).
// Basic Auth (THEHIVE_USER/THEHIVE_PASSWORD), not an API key or a login-then-Bearer flow.
//
// Worth knowing: TheHive 5's published OpenAPI spec (github.com/TheHive-Project/api-docs)
// documents Bearer Token as the security scheme for most endpoints including /api/v1/query,
// obtained via POST /api/v1/login — not Basic Auth directly. Self-hosted instances using a
// Basic-Auth-capable realm (e.g. LocalAuth) commonly also accept `Authorization: Basic` inline
// on API calls, which is what this assumes VPS 6 is configured for. If a live call comes back
// with AuthenticationError, the fallback is a login step: POST /api/v1/login with these same
// credentials to get a session token, then use that as a Bearer token instead — not implemented
// here since Basic Auth was the explicit ask and this hasn't been verified against a live
// TheHive instance (VPS 6 isn't reachable from this dev environment).
//
// Only this module — auth + a connectivity check — is built for now. The in-memory incident
// store in routes/incidentResponse.ts is NOT wired to this yet; that migration (case CRUD,
// replacing the demo data there) is separate, larger scope than the auth mechanism fixed here.

const THEHIVE_URL = process.env.THEHIVE_URL || '';

export function isTheHiveConfigured(): boolean {
    return !!(
        process.env.THEHIVE_URL &&
        process.env.THEHIVE_USER &&
        process.env.THEHIVE_PASSWORD
    );
}

function headers(): Record<string, string> {
    const credentials = Buffer.from(
        `${process.env.THEHIVE_USER}:${process.env.THEHIVE_PASSWORD}`
    ).toString('base64');
    return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'X-Organisation': process.env.THEHIVE_ORG || 'Cybernovr',
    };
}

interface TheHiveResponse<T> {
    status: number;
    json: T | null;
}

async function request<T = unknown>(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: unknown): Promise<TheHiveResponse<T>> {
    if (!THEHIVE_URL) throw new Error('THEHIVE_URL environment variable is not set');
    const res = await fetch(`${THEHIVE_URL}${path}`, {
        method,
        headers: headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
    });
    let json: T | null = null;
    try {
        json = await res.json();
    } catch {
        // empty or non-JSON body — leave json as null rather than throwing
    }
    return { status: res.status, json };
}

/**
 * POST /api/v1/query with a bare `listCase` — the simplest real call that both confirms
 * connectivity and confirms the credentials authenticate. An empty case list ([]) is success,
 * not a "nothing configured" signal; a 401/403 means the Basic Auth credentials were rejected.
 */
export async function testConnection(): Promise<{ ok: boolean; status: number; error?: string }> {
    if (!isTheHiveConfigured()) {
        return { ok: false, status: 0, error: 'THEHIVE_URL/THEHIVE_USER/THEHIVE_PASSWORD not configured' };
    }
    try {
        const { status, json } = await request('/api/v1/query', 'POST', { query: [{ _name: 'listCase' }] });
        if (status === 401 || status === 403) {
            return { ok: false, status, error: 'AuthenticationError — check THEHIVE_USER/THEHIVE_PASSWORD' };
        }
        return {
            ok: status >= 200 && status < 300,
            status,
            error: status >= 400 ? JSON.stringify(json) : undefined,
        };
    } catch (err) {
        return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
    }
}

// ─── Minimal case read/create (added for routes/incidentResponse.ts) ──────────────────────
//
// Scope is deliberately narrow: list + create only, nothing for tasks/observables/stats — those
// aren't called from anywhere in this codebase yet, and building them speculatively against an
// instance this dev environment can't reach (see the file header) would be untested surface
// area. Shapes below follow TheHive 5's documented REST API (github.com/TheHive-Project/api-docs):
// reads go through the /api/v1/query DSL (same endpoint testConnection() above already uses),
// writes go through the plain /api/v1/case resource endpoint. Not verified against a live
// instance — if VPS 6 rejects a field name here, that's the first thing to check.

export interface TheHiveCase {
    _id: string;
    title: string;
    description?: string;
    severity: 1 | 2 | 3 | 4; // TheHive encodes severity as 1=low..4=critical, not a string
    status?: string;
    tags?: string[];
    _createdAt?: number;
    _updatedAt?: number;
}

/**
 * Lists the most recent cases via the query DSL: listCase, newest first, capped at `limit`.
 */
export async function getCases(limit = 50): Promise<TheHiveCase[]> {
    const { status, json } = await request<TheHiveCase[]>('/api/v1/query', 'POST', {
        query: [
            { _name: 'listCase' },
            { _name: 'sort', _fields: [{ _createdAt: 'desc' }] },
            { _name: 'page', from: 0, to: limit },
        ],
    });
    if (status < 200 || status >= 300 || !Array.isArray(json)) {
        throw new Error(`TheHive listCase failed (status ${status}): ${JSON.stringify(json)}`);
    }
    return json;
}

const SEVERITY_TO_THEHIVE: Record<string, 1 | 2 | 3 | 4> = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Creates a new case. `severity` accepts NovrSOC's own low/medium/high/critical strings and maps
 * them to TheHive's 1-4 scale. Returns null (rather than throwing) on failure so callers can
 * decide whether to fall back to the in-memory/Wazuh-derived path instead of hard-failing the
 * request.
 */
export async function createCase(params: {
    title: string;
    description?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
}): Promise<TheHiveCase | null> {
    try {
        const { status, json } = await request<TheHiveCase>('/api/v1/case', 'POST', {
            title: params.title,
            description: params.description || 'Created via NovrSOC',
            severity: SEVERITY_TO_THEHIVE[params.severity ?? 'high'],
            tags: params.tags ?? ['novrsoc'],
        });
        if (status < 200 || status >= 300 || !json) {
            console.error(`TheHive createCase failed (status ${status}):`, json);
            return null;
        }
        return json;
    } catch (err) {
        console.error('TheHive createCase error:', err);
        return null;
    }
}

/** Maps a TheHive case onto the shape routes/incidentResponse.ts's GET / already returns. */
export function formatCaseForNovrSOC(c: TheHiveCase) {
    const severityMap: Record<number, 'low' | 'medium' | 'high' | 'critical'> = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
    return {
        id: c._id,
        title: c.title,
        severity: severityMap[c.severity] ?? 'medium',
        status: (c.status ?? 'new').toLowerCase(),
        summary: c.description ?? '',
        opened_at: c._createdAt ? new Date(c._createdAt).toLocaleString() : new Date().toLocaleString(),
        updated_at: c._updatedAt ? new Date(c._updatedAt).toLocaleString() : new Date().toLocaleString(),
        source: 'thehive' as const,
        tags: c.tags ?? [],
    };
}
