import { Router } from 'express';
import https from 'https';

// TEMPORARY — diagnoses whether this deployment (specifically: Railway) can reach a Wazuh
// Manager at all. Delete this whole file + its mount in index.ts once that's answered; it has
// no reason to exist once Wazuh connectivity is confirmed working or the real fix lands.
//
// Reads WAZUH_DEBUG_* env vars rather than a hardcoded host/credential — this file is
// committed to git, and a real Wazuh password baked into source stays in git history
// permanently even if later "removed." Set WAZUH_DEBUG_HOST/PORT/USER/PASSWORD in Railway's
// dashboard (and locally in backend/.env, which is gitignored) to point this at whatever
// target needs testing. Falls back to the app's normal WAZUH_HOST/WAZUH_USER/WAZUH_PASS if no
// debug-specific vars are set, so this doubles as "test the currently-configured connection."

const router = Router();

const DEBUG_HOST = process.env.WAZUH_DEBUG_HOST || process.env.WAZUH_HOST || '';
const DEBUG_PORT = Number(process.env.WAZUH_DEBUG_PORT || process.env.WAZUH_PORT || 55000);
const DEBUG_USER = process.env.WAZUH_DEBUG_USER || process.env.WAZUH_USER || 'wazuh-wui';
const DEBUG_PASSWORD =
    process.env.WAZUH_DEBUG_PASSWORD || process.env.WAZUH_API_PASSWORD || process.env.WAZUH_PASS || '';

interface RawResponse {
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
}

function testRequest(): Promise<RawResponse> {
    return new Promise((resolve, reject) => {
        const basic = 'Basic ' + Buffer.from(`${DEBUG_USER}:${DEBUG_PASSWORD}`).toString('base64');
        const req = https.request(
            {
                hostname: DEBUG_HOST,
                port: DEBUG_PORT,
                path: '/security/user/authenticate',
                method: 'POST',
                headers: { Authorization: basic },
                rejectUnauthorized: false, // Wazuh's default self-signed cert — same as lib/wazuh.ts
                timeout: 10000,
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
            }
        );
        req.on('timeout', () => req.destroy(new Error(`Connection to ${DEBUG_HOST}:${DEBUG_PORT} timed out after 10s`)));
        req.on('error', reject);
        req.end();
    });
}

// GET /api/debug/wazuh-test
router.get('/wazuh-test', async (_req, res) => {
    const target = `https://${DEBUG_HOST}:${DEBUG_PORT}/security/user/authenticate`;

    if (!DEBUG_HOST || !DEBUG_PASSWORD) {
        res.status(400).json({
            reachable: false,
            target,
            error: 'WAZUH_DEBUG_HOST and/or WAZUH_DEBUG_PASSWORD (or the fallback WAZUH_HOST/WAZUH_PASS) are not set in this environment.',
        });
        return;
    }

    console.log(`[debug/wazuh-test] attempting ${target} as user "${DEBUG_USER}"`);

    try {
        const start = Date.now();
        const response = await testRequest();
        const latencyMs = Date.now() - start;
        console.log(`[debug/wazuh-test] response: HTTP ${response.status} in ${latencyMs}ms`);

        let parsedBody: unknown = response.body;
        try {
            parsedBody = JSON.parse(response.body);
        } catch {
            // non-JSON body — leave as raw string
        }

        res.json({
            reachable: true,
            target,
            user: DEBUG_USER,
            status: response.status,
            latency_ms: latencyMs,
            authenticated: response.status === 200,
            body: parsedBody,
        });
    } catch (err) {
        console.error(`[debug/wazuh-test] connection failed to ${target}:`, err instanceof Error ? err.message : err);
        res.status(502).json({
            reachable: false,
            target,
            user: DEBUG_USER,
            error: err instanceof Error ? err.message : String(err),
            error_code: (err as NodeJS.ErrnoException)?.code ?? null,
        });
    }
});

export default router;
