import https from 'https';

// No hardcoded host fallback on purpose — see lib/wazuh.ts's identical comment. A missing
// WAZUH_INDEXER_HOST env var should fail loudly (below), not silently reach out to whatever
// box happened to be at this IP when it was last written; that box has already moved once.
const INDEXER_HOST = process.env.WAZUH_INDEXER_HOST || '';
const INDEXER_PORT = Number(process.env.WAZUH_INDEXER_PORT || 9200);
const INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
// Accepts either name — local .env has historically used WAZUH_INDEXER_PASS, Railway/newer
// setup docs use WAZUH_INDEXER_PASSWORD for the same value.
const INDEXER_PASS = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_INDEXER_PASS;

/**
 * Shared low-level query helper for the Wazuh Indexer (OpenSearch/Elasticsearch, port 9200).
 * Every Wazuh analytics route searches a different index with a different query body, but
 * they all speak the same protocol — this consolidates what used to be ~10 duplicated copies
 * of this exact function scattered across the old src/app/api/wazuh/* route handlers.
 */
export function search<T = unknown>(index: string, body: unknown): Promise<T | null> {
    return new Promise((resolve, reject) => {
        if (!INDEXER_HOST) {
            reject(new Error('WAZUH_INDEXER_HOST environment variable is not set'));
            return;
        }
        if (!INDEXER_PASS) {
            reject(new Error('WAZUH_INDEXER_PASS environment variable is not set'));
            return;
        }
        const payload = JSON.stringify(body);
        const auth = 'Basic ' + Buffer.from(`${INDEXER_USER}:${INDEXER_PASS}`).toString('base64');
        const agent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
        });

        const req = https.request(
            {
                hostname: INDEXER_HOST,
                port: INDEXER_PORT,
                path: `/${index}/_search`,
                method: 'POST',
                agent: agent, // Use explicit permissive agent
                headers: {
                    Authorization: auth,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 15000,
            },
    // ... rest of the handler remains the same
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(null);
                    }
                });
            }
        );
        req.on('timeout', () => req.destroy(new Error('Wazuh indexer request timed out')));
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}
