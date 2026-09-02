import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { search } from '../lib/wazuh-indexer';

const router = Router();

const MODEL = 'claude-sonnet-4-6';

function isKeyConfigured(): boolean {
    const key = process.env.ANTHROPIC_API_KEY;
    return !!key && key !== 'your-key-here' && !key.startsWith('[');
}

const SYSTEM_INSTRUCTION = `
You are NovrAI, an expert AI Security Operations Center (SOC) Copilot and Cyber Threat Intelligence (CTI) analyst for NovrSOC (by Cybernovr).
Your mission is to provide accurate, actionable cybersecurity analysis, incident triage, and remediation advice.

Core Areas of Expertise:
- Wazuh SIEM log analysis, rule evaluation, and alert correlation.
- MITRE ATT&CK framework mapping (Techniques, Tactics, Procedures).
- Nigerian threat landscape, Telecom/ISP telemetry (MTN, Glo, Airtel, Spectranet, MainOne, IPNX), and regional threat actors.
- Cloud security, vulnerability remediation (CVEs), and compliance frameworks (NDPR, ISO 27001, SOC 2, NIST CSF).

Response Formatting Guidelines:
- Be concise, technical, and direct.
- Structure incident analyses with clear headings (## Summary, ### Threat Assessment, ### Containment & Remediation).
- Use bullet points for steps or indicators of compromise (IoCs).
- Always reference relevant MITRE technique IDs (e.g., T1059, T1078) and CVE identifiers where applicable.
`;

interface IncomingMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// GET /api/novr-ai/status
router.get('/status', (_req: Request, res: Response) => {
    res.json({ configured: isKeyConfigured(), provider: 'claude', model: MODEL });
});

// POST /api/novr-ai
router.post('/', async (req: Request, res: Response) => {
    const { messages } = req.body as {
        messages?: IncomingMessage[];
        model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
    }

    if (!isKeyConfigured()) {
        res.status(503).json({
            error: 'NovrAI unavailable',
            reply: undefined,
            message: 'ANTHROPIC_API_KEY not configured. Add your key to Railway environment variables.',
            configured: false,
        });
        return;
    }

    // Wazuh telemetry context — same live-alert summary the previous Gemini-backed
    // implementation folded into its system prompt, kept so NovrAI still grounds answers in
    // what's actually happening on the indexer rather than answering from training data alone.
    let liveAlertSummary = 'No recent critical indexer alerts.';
    try {
        const indexerResult = await search<any>('wazuh-alerts-4.x-*', {
            size: 5,
            query: { range: { 'rule.level': { gte: 7 } } },
            _source: ['timestamp', 'rule.description', 'rule.level', 'agent.name', 'data.srcip'],
        });
        const hits = indexerResult?.hits?.hits ?? [];
        if (hits.length > 0) {
            liveAlertSummary = hits.map((h: any) => {
                const level = h._source?.rule?.level ?? 'N/A';
                const desc = h._source?.rule?.description ?? 'Unknown alert';
                const agent = h._source?.agent?.name ?? 'Unknown Agent';
                const srcip = h._source?.data?.srcip ?? 'internal';
                return `- [Level ${level}] ${desc} (Agent: ${agent}, Src IP: ${srcip})`;
            }).join('\n');
        }
    } catch {
        // Non-blocking fallback — an indexer outage must not take NovrAI down with it.
    }

    try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: `${SYSTEM_INSTRUCTION}\n\nCurrent Live NovrSOC Telemetry Context:\n${liveAlertSummary}`,
            messages: messages.map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            })),
        });

        const reply = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('');

        if (!reply) {
            throw new Error(`Claude returned no text content (stop_reason: ${response.stop_reason})`);
        }

        res.json({
            reply,
            model: MODEL,
            provider: 'claude',
            configured: true,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('NovrAI Claude error:', err);
        let message = 'Error processing request with Claude';
        if (err instanceof Anthropic.AuthenticationError) message = 'Invalid ANTHROPIC_API_KEY';
        else if (err instanceof Anthropic.RateLimitError) message = 'Claude API rate limit exceeded — try again shortly';
        else if (err instanceof Anthropic.APIError) message = `Claude API error (${err.status}): ${err.message}`;
        else if (err instanceof Error) message = err.message;
        res.status(500).json({ error: message, configured: true });
    }
});

export default router;
