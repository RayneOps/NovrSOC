import https from 'https';

const WAZUH_HOST = process.env.WAZUH_HOST || '164.92.203.205';
const WAZUH_PORT = Number(process.env.WAZUH_PORT || 55000);
const WAZUH_USER = process.env.WAZUH_USER || 'wazuh-wui';
const WAZUH_PASS = process.env.WAZUH_API_PASSWORD || process.env.WAZUH_PASS || '';

interface WazuhResponse {
    status: number;
    json: unknown;
}

function request(path: string, authHeader: string, method: 'GET' | 'POST' = 'GET'): Promise<WazuhResponse> {
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

async function getToken(): Promise<string> {
    if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
    if (!WAZUH_PASS) throw new Error('WAZUH_API_PASSWORD (or WAZUH_PASS) environment variable is not set');
    const basic = 'Basic ' + Buffer.from(`${WAZUH_USER}:${WAZUH_PASS}`).toString('base64');
    const { json } = await request('/security/user/authenticate', basic, 'POST');
    const token = (json as { data?: { token?: string } } | null)?.data?.token;
    if (!token) throw new Error('Wazuh authentication failed');
    cachedToken = { token, expires: Date.now() + 14 * 60 * 1000 };
    return token;
}

export async function wazuhGet(path: string): Promise<WazuhResponse> {
    const token = await getToken();
    return request(path, `Bearer ${token}`, 'GET');
}
