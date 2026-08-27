import https from 'https';

// Wazuh Manager REST API (port 55000). Self-signed cert by default — rejectUnauthorized
// is disabled on this client only (not process-wide), scoped to this known, config-pinned
// host, not arbitrary user-supplied URLs.
//
// Accepts WAZUH_PASSWORD, WAZUH_API_PASSWORD, or WAZUH_PASS for the password — different
// deploys (local .env vs Railway) have used different names for the same value.
const WAZUH_HOST = process.env.WAZUH_HOST || '';
const WAZUH_PORT = Number(process.env.WAZUH_PORT || 55000);
const WAZUH_USER = process.env.WAZUH_USER || 'wazuh-wui';
const WAZUH_PASSWORD =
    process.env.WAZUH_API_PASSWORD || process.env.WAZUH_PASSWORD || process.env.WAZUH_PASS || '';

/** True once host + password are both present — routes use this to skip straight to a
 *  graceful "not configured" response instead of attempting (and failing) a connection. */
export function isConfigured(): boolean {
    return Boolean(WAZUH_HOST && WAZUH_PASSWORD);
}

interface WazuhHttpResponse {
    status: number;
    json: unknown;
}

function request(path: string, authHeader: string, method: 'GET' | 'POST' = 'GET'): Promise<WazuhHttpResponse> {
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: WAZUH_HOST,
                port: WAZUH_PORT,
                path,
                method,
                headers: { Authorization: authHeader },
                rejectUnauthorized: false,
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode ?? 500, json: JSON.parse(body) });
                    } catch {
                        resolve({ status: res.statusCode ?? 500, json: null });
                    }
                });
            }
        );
        req.on('error', reject);
        req.end();
    });
}

let cachedToken: { token: string; expires: number } | null = null;

/** POST /security/user/authenticate with Basic auth — returns a JWT, cached for 15 minutes. */
export async function authenticate(): Promise<string> {
    if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
    if (!WAZUH_HOST) throw new Error('WAZUH_HOST environment variable is not set');
    if (!WAZUH_PASSWORD) throw new Error('WAZUH_PASSWORD (or WAZUH_API_PASSWORD / WAZUH_PASS) environment variable is not set');

    const url = `https://${WAZUH_HOST}:${WAZUH_PORT}/security/user/authenticate`;
    // Host and URL only, never the credential — see lib/wazuh.ts's identical logging (this
    // file duplicates that one's auth logic; routes/wazuh.ts's /status and routes/platform.ts's
    // health check both go through THIS file's authenticate(), not lib/wazuh.ts's).
    console.log(`[wazuh] authenticating as "${WAZUH_USER}" — WAZUH_HOST=${WAZUH_HOST}, url=${url}`);

    const basic = 'Basic ' + Buffer.from(`${WAZUH_USER}:${WAZUH_PASSWORD}`).toString('base64');
    let status: number, json: unknown;
    try {
        ({ status, json } = await request('/security/user/authenticate', basic, 'POST'));
    } catch (err) {
        console.error(`[wazuh] connection to ${url} failed:`, err instanceof Error ? err.message : err);
        throw err;
    }
    const token = (json as { data?: { token?: string } } | null)?.data?.token;
    if (!token) {
        console.error(`[wazuh] authentication to ${url} failed — status ${status}, response:`, JSON.stringify(json));
        throw new Error(`Wazuh authentication failed (status ${status})`);
    }

    cachedToken = { token, expires: Date.now() + 15 * 60 * 1000 };
    return token;
}

async function authedGet(path: string): Promise<WazuhHttpResponse> {
    const token = await authenticate();
    return request(path, `Bearer ${token}`, 'GET');
}

function affectedItems(json: unknown): Record<string, unknown>[] {
    const items = (json as { data?: { affected_items?: unknown[] } } | null)?.data?.affected_items;
    return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

// ── Agents ──────────────────────────────────────────────────────────────

export interface WazuhAgent {
    id: string;
    name: string;
    ip: string | null;
    os: string | null;
    status: string;
    last_keepalive: string | null;
    version: string | null;
}

/** GET /agents — every agent enrolled with the manager. */
export async function getAgents(): Promise<WazuhAgent[]> {
    const { json } = await authedGet('/agents?limit=500');
    return affectedItems(json).map((a) => {
        const os = a.os as { name?: string; version?: string } | undefined;
        return {
            id: String(a.id ?? ''),
            name: String(a.name ?? 'Unknown'),
            ip: (a.ip as string) ?? null,
            os: os?.name ? `${os.name} ${os.version ?? ''}`.trim() : null,
            status: String(a.status ?? 'unknown'),
            last_keepalive: (a.lastKeepAlive as string) ?? null,
            version: (a.version as string) ?? null,
        };
    });
}

// ── Alerts ──────────────────────────────────────────────────────────────

export interface WazuhAlert {
    id: string;
    timestamp: string | null;
    rule_id: string;
    rule_level: number;
    rule_description: string;
    rule_groups: string[];
    mitre_tactic: string | null;
    mitre_technique: string | null;
    agent_id: string;
    agent_name: string;
    source_ip: string | null;
    location: string | null;
}

/** GET /alerts — most recent alerts recorded by the manager. */
export async function getAlerts(limit = 50): Promise<WazuhAlert[]> {
    const { json } = await authedGet(`/alerts?limit=${limit}&sort=-timestamp`);
    return affectedItems(json).map((a) => {
        const rule = a.rule as { id?: number | string; level?: number; description?: string; groups?: string[]; mitre?: { tactic?: string[]; technique?: string[] } } | undefined;
        const agent = a.agent as { id?: string; name?: string } | undefined;
        const data = a.data as { srcip?: string } | undefined;
        return {
            id: a.id != null ? String(a.id) : `${a.timestamp ?? ''}-${rule?.id ?? ''}`,
            timestamp: (a.timestamp as string) ?? null,
            rule_id: rule?.id != null ? String(rule.id) : '',
            rule_level: rule?.level ?? 0,
            rule_description: rule?.description ?? 'Wazuh alert',
            rule_groups: rule?.groups ?? [],
            mitre_tactic: rule?.mitre?.tactic?.[0] ?? null,
            mitre_technique: rule?.mitre?.technique?.[0] ?? null,
            agent_id: agent?.id ?? '',
            agent_name: agent?.name ?? 'Unknown',
            source_ip: data?.srcip ?? null,
            location: (a.location as string) ?? null,
        };
    });
}

// ── Vulnerabilities ─────────────────────────────────────────────────────

export interface WazuhVulnerability {
    cve: string;
    title: string;
    severity: string;
    cvss_score: number | null;
    package: string;
    version: string;
}

/** GET /vulnerability/{agent_id} — CVE matches for one agent's installed packages.
 *  Only present on managers still running the legacy vulnerability-detector module
 *  (Wazuh <=4.7); 4.8+ moved this to the indexer instead. */
export async function getAgentVulnerabilities(agentId: string): Promise<WazuhVulnerability[]> {
    const { json } = await authedGet(`/vulnerability/${encodeURIComponent(agentId)}?limit=100`);
    return affectedItems(json).map((v) => ({
        cve: String(v.cve ?? ''),
        title: String(v.title ?? v.cve ?? ''),
        severity: String(v.severity ?? 'Unknown'),
        cvss_score: (v.cvss3_score as number) ?? (v.cvss2_score as number) ?? null,
        package: String(v.name ?? ''),
        version: String(v.version ?? ''),
    }));
}

// ── Software inventory ──────────────────────────────────────────────────

export interface WazuhPackage {
    name: string;
    version: string;
    architecture: string | null;
    vendor: string | null;
    description: string | null;
}

/** GET /syscollector/{agent_id}/packages — installed software inventory for one agent. */
export async function getAgentInventory(agentId: string): Promise<WazuhPackage[]> {
    const { json } = await authedGet(`/syscollector/${encodeURIComponent(agentId)}/packages?limit=100`);
    return affectedItems(json).map((p) => ({
        name: String(p.name ?? ''),
        version: String(p.version ?? ''),
        architecture: (p.architecture as string) ?? null,
        vendor: (p.vendor as string) ?? null,
        description: (p.description as string) ?? null,
    }));
}
