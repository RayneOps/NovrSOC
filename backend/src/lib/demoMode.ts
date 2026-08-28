// Opt-in presentation mode — set DEMO_MODE=true to make Wazuh-backed endpoints return fixed,
// clearly-labeled demo data instead of attempting the real connection at all.
//
// Deliberately NOT an automatic fallback on connection failure. A real outage during normal
// operation must still honestly report connected:false / source:'mock' — that's the existing,
// deliberate behavior throughout this codebase (see routes/assets.ts's and
// routes/dashboard.ts's comments on why "never mock data" is the default: a dashboard that
// silently claims "3 agents active, all healthy" during a genuine outage is a worse failure
// mode for a security product than an honest zero). DEMO_MODE exists so that choice can be
// made explicitly and temporarily (flip it on before a presentation, off afterward), never as
// something that quietly kicks in on its own the moment Wazuh has a bad moment in production.
export function isDemoMode(): boolean {
    return process.env.DEMO_MODE === 'true';
}

export interface DemoAgent {
    id: string;
    name: string;
    ip: string;
    status: string;
    lastSeen: string;
    os: string;
    group: string;
    version: string;
}

export const DEMO_AGENTS: DemoAgent[] = [
    { id: '001', name: 'RayneOps', ip: '10.177.163.139', status: 'active', lastSeen: '2026-08-28T16:00:00Z', os: 'Microsoft Windows 11 Pro 10.0.26100', group: 'default', version: 'v4.7.5' },
    { id: '002', name: 'karl-laptop', ip: '10.177.163.142', status: 'active', lastSeen: '2026-08-28T15:55:00Z', os: 'Microsoft Windows 10 Pro 10.0.19045', group: 'default', version: 'v4.7.5' },
    { id: '003', name: 'novrsoc-vps8', ip: '169.58.242.174', status: 'active', lastSeen: '2026-08-28T16:01:00Z', os: 'Ubuntu 22.04.5 LTS', group: 'default', version: 'v4.7.5' },
];
