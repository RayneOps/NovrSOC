// UptimeRobot — independent SLA uptime witness
// Free: 50 monitors, 5-min checks
// Get key: uptimerobot.com/signUp → My Settings → API Settings
// Set: UPTIMEROBOT_API_KEY=...

function getKey(): string | null {
    const key = process.env.UPTIMEROBOT_API_KEY;
    if (!key || key === 'REPLACE_WHEN_OBTAINED') return null;
    return key;
}

export interface UptimeMonitor {
    id: number;
    friendly_name: string;
    url: string;
    type: number;
    status: number; // 0=paused, 1=not checked, 2=up, 8=seems down, 9=down
    uptime_ratio: string;
    response_times: Array<{ datetime: number; value: number }>;
}

interface UptimeRobotResponse {
    monitors?: UptimeMonitor[];
}

export async function getMonitors(): Promise<UptimeMonitor[]> {
    const key = getKey();
    if (!key) return [];

    try {
        const body = new URLSearchParams({
            api_key: key,
            format: 'json',
            response_times: '1',
            response_times_limit: '10',
            uptime_ratio: '1',
        });

        const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return [];
        const data = (await res.json()) as UptimeRobotResponse;
        return data.monitors || [];
    } catch {
        return [];
    }
}

export function statusLabel(status: number): string {
    const labels: Record<number, string> = { 0: 'paused', 1: 'not checked', 2: 'up', 8: 'seems down', 9: 'down' };
    return labels[status] ?? 'unknown';
}

export function isConfigured(): boolean {
    return !!getKey();
}
