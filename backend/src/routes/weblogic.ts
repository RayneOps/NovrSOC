import { Router } from 'express';

// Infrastructure > WebLogic Appliances — demo data for Dangote Group's Java middleware cluster.

const router = Router();

type ServerStatus = 'running' | 'warning' | 'critical' | 'stopped';

interface JdbcPool {
    name: string;
    active: number;
    max: number;
}

interface ManagedServer {
    id: string;
    name: string;
    type: 'Admin Server' | 'Managed Server';
    status: ServerStatus;
    heap_used_mb: number;
    heap_max_mb: number;
    thread_pool_active: number;
    thread_pool_max: number;
    thread_pool_queued: number;
    jdbc_pools: JdbcPool[];
    uptime: string;
    last_checked: string;
    recommendation: string | null;
}

interface WebLogicDomain {
    id: string;
    name: string;
    organization: string;
    version: string;
    status: ServerStatus;
    servers: ManagedServer[];
}

function heapPercent(server: ManagedServer): number {
    return Math.round((server.heap_used_mb / server.heap_max_mb) * 100);
}

const MOCK_DOMAINS: WebLogicDomain[] = [
    {
        id: 'dom_dangote_01',
        name: 'DangoteMiddlewareDomain',
        organization: 'Dangote Group',
        version: 'WebLogic 14.1.1.0',
        status: 'warning',
        servers: [
            {
                id: 'srv_admin',
                name: 'AdminServer',
                type: 'Admin Server',
                status: 'running',
                heap_used_mb: 1024,
                heap_max_mb: 4096,
                thread_pool_active: 8,
                thread_pool_max: 50,
                thread_pool_queued: 0,
                jdbc_pools: [{ name: 'DangoteERPPool', active: 4, max: 40 }],
                uptime: '46d 12h',
                last_checked: '2026-08-14 09:02:00',
                recommendation: null,
            },
            {
                id: 'srv_ms1',
                name: 'ManagedServer-1',
                type: 'Managed Server',
                status: 'warning',
                heap_used_mb: 3482,
                heap_max_mb: 4096,
                thread_pool_active: 47,
                thread_pool_max: 50,
                thread_pool_queued: 12,
                jdbc_pools: [
                    { name: 'DangoteERPPool', active: 36, max: 40 },
                    { name: 'DangoteReportingPool', active: 18, max: 20 },
                ],
                uptime: '46d 12h',
                last_checked: '2026-08-14 09:02:00',
                recommendation: 'Heap usage at 85% and climbing over the last 4 hours. Thread pool is near saturation (47/50) with 12 requests queued. Recommend triggering a full GC during the next maintenance window and reviewing the ERP batch job schedule for a possible memory leak in the nightly reconciliation task.',
            },
            {
                id: 'srv_ms2',
                name: 'ManagedServer-2',
                type: 'Managed Server',
                status: 'running',
                heap_used_mb: 1740,
                heap_max_mb: 4096,
                thread_pool_active: 14,
                thread_pool_max: 50,
                thread_pool_queued: 0,
                jdbc_pools: [{ name: 'DangoteERPPool', active: 9, max: 40 }],
                uptime: '46d 12h',
                last_checked: '2026-08-14 09:02:00',
                recommendation: null,
            },
        ],
    },
];

router.get('/domains', (_req, res) => {
    const domains = MOCK_DOMAINS.map((d) => ({
        ...d,
        servers: d.servers.map((s) => ({ ...s, heap_percent: heapPercent(s) })),
    }));
    const allServers = MOCK_DOMAINS.flatMap((d) => d.servers);
    const stats = {
        domain_count: MOCK_DOMAINS.length,
        server_count: allServers.length,
        warning_count: allServers.filter((s) => s.status === 'warning' || s.status === 'critical').length,
        avg_heap_percent: Math.round(allServers.reduce((sum, s) => sum + heapPercent(s), 0) / allServers.length),
    };
    res.json({ domains, stats });
});

router.get('/domains/:domainId/servers/:serverId', (req, res) => {
    const domain = MOCK_DOMAINS.find((d) => d.id === req.params.domainId);
    const server = domain?.servers.find((s) => s.id === req.params.serverId);
    if (!domain || !server) {
        res.status(404).json({ error: 'Server not found' });
        return;
    }
    res.json({ ...server, heap_percent: heapPercent(server) });
});

router.post('/:serverId/gc', (req, res) => {
    const server = MOCK_DOMAINS.flatMap((d) => d.servers).find((s) => s.id === req.params.serverId);
    if (!server) {
        res.status(404).json({ error: 'Server not found' });
        return;
    }

    const before = server.heap_used_mb;
    server.heap_used_mb = Math.round(server.heap_max_mb * 0.42);
    server.last_checked = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (heapPercent(server) < 60) {
        server.status = 'running';
        server.recommendation = null;
    }

    res.json({
        success: true,
        message: `Full GC completed on ${server.name}. Heap reduced from ${before}MB to ${server.heap_used_mb}MB.`,
        server: { ...server, heap_percent: heapPercent(server) },
    });
});

export default router;
