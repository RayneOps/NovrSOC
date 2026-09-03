// Auto-closes low/medium-severity TheHive cases once Wazuh has stopped surfacing new activity
// for a while and nobody is actively working the case. Mirrors jobs/ctiWatcher.ts's shape
// (run-then-interval, unref() so it can't block process shutdown, every error swallowed and
// logged rather than thrown) since that's this codebase's established pattern for background
// jobs — see index.ts's startCTIWatcher for the same reasoning spelled out.
import { getCases, updateCase, isTheHiveConfigured, isTheHiveStatusTerminal } from '../services/thehive';

const AUTO_CLOSE_AFTER_MS = 30 * 60 * 1000; // 30 minutes of no update activity
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // run every 5 minutes

async function runAutoClose(): Promise<void> {
    const cases = await getCases(100);

    for (const c of cases) {
        if (c.severity > 2) continue; // only low (1) / medium (2) — high/critical always need a human
        if (isTheHiveStatusTerminal(c.status)) continue; // already resolved/closed
        if (c.status === 'InProgress') continue; // an analyst has started working it — leave it alone

        const updatedAt = c._updatedAt ?? 0;
        const ageMs = Date.now() - updatedAt;
        if (!updatedAt || ageMs < AUTO_CLOSE_AFTER_MS) continue; // too recent, or no timestamp to trust

        const closedAt = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' });
        const result = await updateCase(c._id, {
            status: 'Other',
            summary: `${c.description ?? c.summary ?? ''}\n\nAuto-resolved by NovrSOC: no new activity detected for 30 minutes. Severity: ${c.severity === 1 ? 'Low' : 'Medium'}. Auto-closed at ${closedAt} WAT.`.trim(),
        });

        if (result) {
            console.log(`[AutoClose] Resolved case ${c._id}: ${c.title}`);
        } else {
            console.error(`[AutoClose] Failed to resolve case ${c._id}: ${c.title}`);
        }
    }
}

export function startAutoCloseJob(): void {
    if (!isTheHiveConfigured()) {
        console.log('[AutoClose] TheHive not configured — job not started');
        return;
    }

    console.log('[AutoClose] Job started — checking every 5 minutes');

    const tick = () => {
        runAutoClose().catch((err) => {
            console.error('[AutoClose] Error:', err instanceof Error ? err.message : err);
        });
    };

    tick(); // run once on boot rather than waiting a full 5 minutes for the first pass
    setInterval(tick, CHECK_INTERVAL_MS).unref();
}
