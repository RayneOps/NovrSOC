import https from 'https';

// No hardcoded host fallback on purpose (see services/wazuh.ts's isConfigured() for the same
// pattern) — this used to default to a specific box's IP, which meant a missing WAZUH_HOST
// env var silently pointed this client at whatever server last happened to be there instead
// of failing loudly. That box has since moved at least once; don't reintroduce a stale IP.
const WAZUH_HOST = process.env.WAZUH_HOST || '';
const WAZUH_PORT = Number(process.env.WAZUH_PORT || 55000);
const WAZUH_USER = process.env.WAZUH_USER || 'wazuh-wui';
const WAZUH_PASS = process.env.WAZUH_API_PASSWORD || process.env.WAZUH_PASS || '';

interface WazuhResponse {
    status: number;
    json: unknown;
}

function request(path: string, authHeader: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown): Promise<WazuhResponse> {
    return new Promise((resolve, reject) => {
        const payload = body !== undefined ? JSON.stringify(body) : undefined;
        const headers: Record<string, string> = { Authorization: authHeader };
        if (payload !== undefined) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = String(Buffer.byteLength(payload));
        }
        const req = https.request(
            {
                hostname: WAZUH_HOST,
                port: WAZUH_PORT,
                path,
                method,
                headers,
                // Wazuh ships with a self-signed cert by default — this app talks to a known,
                // pinned-by-config host/port, not arbitrary user-supplied URLs, so disabling
                // verification here is scoped to this client only (not process-wide).
                rejectUnauthorized: false,
            },
            (res) => {
                let respBody = '';
                res.on('data', (chunk) => (respBody += chunk));
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode ?? 500, json: JSON.parse(respBody) });
                    } catch {
                        resolve({ status: res.statusCode ?? 500, json: null });
                    }
                });
            }
        );
        req.on('error', reject);
        if (payload !== undefined) req.write(payload);
        req.end();
    });
}

let cachedToken: { token: string; expires: number } | null = null;

/** POST /security/user/authenticate with Basic auth — returns a JWT, cached for ~14 min
 *  (Wazuh's default token TTL is 15 min). */
export async function authenticate(): Promise<string> {
    if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
    if (!WAZUH_HOST) throw new Error('WAZUH_HOST environment variable is not set');
    if (!WAZUH_PASS) throw new Error('WAZUH_API_PASSWORD (or WAZUH_PASS) environment variable is not set');
    const basic = 'Basic ' + Buffer.from(`${WAZUH_USER}:${WAZUH_PASS}`).toString('base64');
    const { json } = await request('/security/user/authenticate', basic, 'POST');
    const token = (json as { data?: { token?: string } } | null)?.data?.token;
    if (!token) throw new Error('Wazuh authentication failed');
    cachedToken = { token, expires: Date.now() + 14 * 60 * 1000 };
    return token;
}

export async function wazuhGet(path: string): Promise<WazuhResponse> {
    const token = await authenticate();
    return request(path, `Bearer ${token}`, 'GET');
}

export async function wazuhPost(path: string, body?: unknown): Promise<WazuhResponse> {
    const token = await authenticate();
    return request(path, `Bearer ${token}`, 'POST', body);
}
