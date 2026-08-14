import { Router } from 'express';
import { getMonitors } from '../services/uptimerobot';

// Recovery Credit / SLA — uptime tracking against SLA targets and financial credit
// calculation. Demo data for now; UptimeRobot (services/uptimerobot.ts) is wired in as a real
// "is a third-party witness even connected" status check, not yet as the actual uptime source.

const router = Router();

interface Client {
    id: string;
    name: string;
    plan: string;
    monthly_fee_usd: number;
    sla_target_pct: number;
    contract_start: string;
}

interface Incident {
    id: string;
    start: string;
    end: string;
    duration_mins: number;
    cause: string;
    resolved_by: string;
}

interface Endpoint {
    id: string;
    client_id: string;
    name: string;
    url: string;
    check_type: string;
    status: string;
    uptime_pct_month: number;
    downtime_seconds_month: number;
    avg_response_ms: number;
    incidents: Incident[];
}

const MOCK_CLIENTS: Client[] = [
    { id: 'cl_001', name: 'Cybernovr (Internal)', plan: 'Enterprise', monthly_fee_usd: 0, sla_target_pct: 99.9, contract_start: '2026-01-01' },
    { id: 'cl_002', name: 'Dangote Group', plan: 'Enterprise', monthly_fee_usd: 2500, sla_target_pct: 99.9, contract_start: '2026-03-15' },
    { id: 'cl_003', name: 'GTBank', plan: 'Professional', monthly_fee_usd: 1200, sla_target_pct: 99.5, contract_start: '2026-05-01' },
    { id: 'cl_004', name: 'MTN Nigeria', plan: 'Professional', monthly_fee_usd: 1500, sla_target_pct: 99.5, contract_start: '2026-06-01' },
];

const MOCK_ENDPOINTS: Endpoint[] = [
    // Dangote — had an outage (the story)
    {
        id: 'ep_001',
        client_id: 'cl_002',
        name: 'Dangote ERP Portal',
        url: 'https://erp.dangote-group.com',
        check_type: 'https',
        status: 'up',
        uptime_pct_month: 99.891, // just above 99.9%, but had one outage
        downtime_seconds_month: 2847, // 47.45 minutes — breaches 99.9% SLA
        avg_response_ms: 342,
        incidents: [
            {
                id: 'inc_ep_001',
                start: '2026-08-06 14:23:11',
                end: '2026-08-06 15:10:33',
                duration_mins: 47.4,
                cause: 'DDoS attack — 2.4 Gbps volumetric flood from 14 countries',
                resolved_by: 'Cloudflare rate limiting + OPNsense firewall block',
            },
        ],
    },
    // GTBank — clean
    {
        id: 'ep_002',
        client_id: 'cl_003',
        name: 'GTBank Client Dashboard',
        url: 'https://dashboard.gtbank-novrsoc.com',
        check_type: 'https',
        status: 'up',
        uptime_pct_month: 100.0,
        downtime_seconds_month: 0,
        avg_response_ms: 218,
        incidents: [],
    },
    // MTN — minor planned maintenance
    {
        id: 'ep_003',
        client_id: 'cl_004',
        name: 'MTN SOC Portal',
        url: 'https://soc.mtn-novrsoc.com',
        check_type: 'https',
        status: 'up',
        uptime_pct_month: 99.97,
        downtime_seconds_month: 780, // 13 minutes — planned maintenance
        avg_response_ms: 156,
        incidents: [
            {
                id: 'inc_ep_003',
                start: '2026-08-08 02:00:00',
                end: '2026-08-08 02:13:00',
                duration_mins: 13,
                cause: 'Scheduled maintenance — Wazuh agent update deployment',
                resolved_by: 'Automated — maintenance window completed',
            },
        ],
    },
    // Cybernovr internal
    {
        id: 'ep_004',
        client_id: 'cl_001',
        name: 'NovrSOC Platform',
        url: 'https://app.novrsoc.com',
        check_type: 'https',
        status: 'up',
        uptime_pct_month: 99.998,
        downtime_seconds_month: 52,
        avg_response_ms: 89,
        incidents: [],
    },
];

interface CreditResult {
    breached: boolean;
    credit_pct: number;
    credit_usd: number;
    tier: string;
}

function calcCredit(uptimePct: number, slaTarget: number, monthlyFeeUsd: number): CreditResult {
    if (uptimePct >= slaTarget) {
        return { breached: false, credit_pct: 0, credit_usd: 0, tier: 'Met SLA' };
    }
    let creditPct = 0;
    let tier = '';
    if (uptimePct >= 99.0) { creditPct = 10; tier = '10% — Minor Breach'; }
    else if (uptimePct >= 98.0) { creditPct = 25; tier = '25% — Moderate Breach'; }
    else if (uptimePct >= 95.0) { creditPct = 50; tier = '50% — Significant Breach'; }
    else { creditPct = 100; tier = '100% — Critical Breach'; }

    return {
        breached: true,
        credit_pct: creditPct,
        credit_usd: Math.round((monthlyFeeUsd * creditPct) / 100),
        tier,
    };
}

function clientFor(clientId: string): Client {
    return MOCK_CLIENTS.find((c) => c.id === clientId) ?? MOCK_CLIENTS[0];
}

// GET /api/sla/overview
router.get('/overview', async (_req, res) => {
    const enrichedEndpoints = MOCK_ENDPOINTS.map((ep) => {
        const client = clientFor(ep.client_id);
        const credit = calcCredit(ep.uptime_pct_month, client.sla_target_pct, client.monthly_fee_usd);
        return { ...ep, client, credit };
    });

    const totalCredits = enrichedEndpoints.reduce((s, ep) => s + ep.credit.credit_usd, 0);
    const breachedCount = enrichedEndpoints.filter((ep) => ep.credit.breached).length;

    // Try UptimeRobot if configured — this is a real, live check (not mock).
    let uptimerobotStatus = 'not_configured';
    try {
        const monitors = await getMonitors();
        if (monitors.length > 0) uptimerobotStatus = 'connected';
    } catch {
        // non-fatal
    }

    res.json({
        endpoints: enrichedEndpoints,
        summary: {
            total_endpoints: enrichedEndpoints.length,
            breached: breachedCount,
            total_credits_usd: totalCredits,
            uptimerobot_status: uptimerobotStatus,
            period: 'August 2026',
        },
    });
});

// GET /api/sla/endpoints/:id
router.get('/endpoints/:id', (req, res) => {
    const ep = MOCK_ENDPOINTS.find((e) => e.id === req.params.id);
    if (!ep) {
        res.status(404).json({ error: 'Endpoint not found' });
        return;
    }
    const client = clientFor(ep.client_id);
    const credit = calcCredit(ep.uptime_pct_month, client.sla_target_pct, client.monthly_fee_usd);
    res.json({ ...ep, client, credit });
});

// GET /api/sla/clients
router.get('/clients', (_req, res) => {
    res.json({ clients: MOCK_CLIENTS });
});

export default router;
