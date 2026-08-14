import { Router } from 'express';

// Data Loss Recovery — backup job monitoring, hash-integrity verification, restore-point
// tracking. Demo data for now (real Backup Probe Daemon on EC2-5 doesn't exist yet — same
// "structured mock data now, real crawlers later" pattern used elsewhere in this backend).

const router = Router();

type BackupStatus = 'success' | 'failed' | 'running' | 'missed';

interface BackupJob {
    id: string;
    name: string;
    target: string;
    backup_type: string;
    status: BackupStatus;
    size_bytes: number;
    hash_sha256: string | null;
    hash_verified: boolean;
    started_at: string;
    completed_at: string | null;
    duration_mins: number | null;
    restore_point: string | null;
    retention_days: number;
    next_scheduled: string;
    storage_path: string;
    snapshots_count: number;
    failure_reason?: string;
}

const MOCK_BACKUP_JOBS: BackupJob[] = [
    {
        id: 'bj_001',
        name: 'EC2-1 App Server — Daily Snapshot',
        target: 'ec2-app-server (10.0.1.10)',
        backup_type: 's3',
        status: 'success',
        size_bytes: 8_540_000_000,
        hash_sha256: 'a3f5c2d8e9b1047f6c4a2e8d3f1b5c9e7a2d4f8b1c5e3a7d9f2b4e6c8a1d3f5',
        hash_verified: true,
        started_at: '2026-08-12 02:00:11',
        completed_at: '2026-08-12 02:14:38',
        duration_mins: 14,
        restore_point: '2026-08-12 02:14:38',
        retention_days: 30,
        next_scheduled: '2026-08-13 02:00:00',
        storage_path: 's3://novrsoc-backups/ec2-app/2026-08-12/',
        snapshots_count: 30,
    },
    {
        id: 'bj_002',
        name: 'EC2-2 Wazuh Server — Daily Snapshot',
        target: 'ec2-wazuh-server (10.0.1.20)',
        backup_type: 's3',
        status: 'success',
        size_bytes: 42_300_000_000,
        hash_sha256: 'b7e2d4f6a8c1e3b5d7f9a2c4e6b8d1f3a5c7e9b2d4f6a8c1e3b5d7f9a2c4e6b8',
        hash_verified: true,
        started_at: '2026-08-12 01:00:00',
        completed_at: '2026-08-12 02:47:22',
        duration_mins: 107,
        restore_point: '2026-08-12 02:47:22',
        retention_days: 30,
        next_scheduled: '2026-08-13 01:00:00',
        storage_path: 's3://novrsoc-backups/wazuh/2026-08-12/',
        snapshots_count: 30,
    },
    {
        id: 'bj_003',
        name: 'RDS PostgreSQL — Automated Snapshot',
        target: 'novrsoc-postgres.rds.amazonaws.com',
        backup_type: 's3',
        status: 'success',
        size_bytes: 2_100_000_000,
        hash_sha256: 'c9f3e5a7b2d4f6c8e1a3b5d7f9c2e4a6b8d1f3c5e7a9b2d4f6c8e1a3b5d7f9c2',
        hash_verified: true,
        started_at: '2026-08-12 03:00:00',
        completed_at: '2026-08-12 03:08:14',
        duration_mins: 8,
        restore_point: '2026-08-12 03:08:14',
        retention_days: 7,
        next_scheduled: '2026-08-13 03:00:00',
        storage_path: 's3://novrsoc-backups/rds/2026-08-12/',
        snapshots_count: 7,
    },
    {
        id: 'bj_004',
        name: 'EC2-3 Sensor Instance — Daily Snapshot',
        target: 'ec2-sensor (10.0.1.30)',
        backup_type: 's3',
        status: 'failed', // ← the story: last night's alert
        size_bytes: 0,
        hash_sha256: null,
        hash_verified: false,
        started_at: '2026-08-12 04:00:00',
        completed_at: null,
        duration_mins: null,
        restore_point: '2026-08-11 04:09:32', // last successful restore point
        retention_days: 30,
        next_scheduled: '2026-08-13 04:00:00',
        storage_path: 's3://novrsoc-backups/sensor/2026-08-12/',
        snapshots_count: 29,
        failure_reason: 'S3 upload timeout — EC2 to S3 transfer exceeded 2 hour limit. Disk I/O spike from Zeek log rotation.',
    },
    {
        id: 'bj_005',
        name: 'EC2-5 Auxiliary — Daily Snapshot',
        target: 'ec2-auxiliary (10.0.1.50)',
        backup_type: 's3',
        status: 'success',
        size_bytes: 890_000_000,
        hash_sha256: 'd2e4f6a8c1b3d5f7e9a2c4b6d8f1a3c5e7b9d2f4a6c8e1b3d5f7e9a2c4b6d8f1',
        hash_verified: true,
        started_at: '2026-08-12 04:30:00',
        completed_at: '2026-08-12 04:33:47',
        duration_mins: 3,
        restore_point: '2026-08-12 04:33:47',
        retention_days: 30,
        next_scheduled: '2026-08-13 04:30:00',
        storage_path: 's3://novrsoc-backups/auxiliary/2026-08-12/',
        snapshots_count: 30,
    },
];

interface RetentionEntry {
    date: string;
    status: string;
    size_gb: number;
}

// Retention calendar — last 7 days of snapshots per job. Only the two jobs with a "story"
// (bj_001 healthy, bj_004 today's failure) have demo history; others fall back to [] below.
const MOCK_RETENTION: Record<string, RetentionEntry[]> = {
    bj_001: [
        { date: '2026-08-12', status: 'success', size_gb: 8.54 },
        { date: '2026-08-11', status: 'success', size_gb: 8.51 },
        { date: '2026-08-10', status: 'success', size_gb: 8.49 },
        { date: '2026-08-09', status: 'success', size_gb: 8.47 },
        { date: '2026-08-08', status: 'success', size_gb: 8.45 },
        { date: '2026-08-07', status: 'success', size_gb: 8.43 },
        { date: '2026-08-06', status: 'success', size_gb: 8.40 },
    ],
    bj_004: [
        { date: '2026-08-12', status: 'failed', size_gb: 0 }, // today's failure
        { date: '2026-08-11', status: 'success', size_gb: 15.2 },
        { date: '2026-08-10', status: 'success', size_gb: 15.1 },
        { date: '2026-08-09', status: 'success', size_gb: 14.9 },
        { date: '2026-08-08', status: 'success', size_gb: 14.8 },
        { date: '2026-08-07', status: 'success', size_gb: 14.7 },
        { date: '2026-08-06', status: 'success', size_gb: 14.5 },
    ],
};

// GET /api/recovery/jobs
router.get('/jobs', (_req, res) => {
    const stats = {
        total: MOCK_BACKUP_JOBS.length,
        success: MOCK_BACKUP_JOBS.filter((j) => j.status === 'success').length,
        failed: MOCK_BACKUP_JOBS.filter((j) => j.status === 'failed').length,
        total_size_tb: (MOCK_BACKUP_JOBS.reduce((s, j) => s + j.size_bytes, 0) / 1e12).toFixed(2),
        hash_verified: MOCK_BACKUP_JOBS.filter((j) => j.hash_verified).length,
    };
    res.json({ jobs: MOCK_BACKUP_JOBS, stats });
});

// GET /api/recovery/jobs/:id
router.get('/jobs/:id', (req, res) => {
    const job = MOCK_BACKUP_JOBS.find((j) => j.id === req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    const retention = MOCK_RETENTION[req.params.id] ?? [];
    res.json({ ...job, retention });
});

// POST /api/recovery/jobs/:id/retry
router.post('/jobs/:id/retry', (req, res) => {
    const job = MOCK_BACKUP_JOBS.find((j) => j.id === req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    res.json({
        success: true,
        message: `Backup job "${job.name}" queued for immediate execution.`,
        estimated_start: new Date(Date.now() + 60000).toISOString(),
    });
});

// GET /api/recovery/health
router.get('/health', (_req, res) => {
    const failed = MOCK_BACKUP_JOBS.filter((j) => j.status === 'failed');
    const oldestRestore = MOCK_BACKUP_JOBS
        .filter((j) => j.restore_point)
        .sort((a, b) => new Date(a.restore_point as string).getTime() - new Date(b.restore_point as string).getTime())[0];

    res.json({
        overall_status: failed.length > 0 ? 'degraded' : 'healthy',
        failed_jobs: failed.length,
        success_rate_pct: Math.round((MOCK_BACKUP_JOBS.filter((j) => j.status === 'success').length / MOCK_BACKUP_JOBS.length) * 100),
        oldest_restore_point: oldestRestore?.restore_point ?? null,
        hash_integrity: 'verified',
        aws_s3_status: 'operational',
        object_lock_enabled: true,
    });
});

export default router;
