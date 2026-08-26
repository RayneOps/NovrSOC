import { syncWazuhIOCs, watcherStats } from '../lib/orgCtiStore';

// Periodic background sync — pulls new Wazuh alerts since the last sync and folds any newly
// seen external IPs into the org CTI store (lib/orgCtiStore.ts). GET /api/org-cti/iocs also
// calls syncWazuhIOCs() on demand, so this interval is really just "keep the store warm even
// when nobody's looking at the page" — both callers share the same cursor, so neither
// duplicates the other's work.

export async function runCTIWatcher(): Promise<void> {
    try {
        const { newIps, hitCount } = await syncWazuhIOCs(100);
        if (hitCount > 0) {
            const stats = watcherStats();
            console.log(`[CTI Watcher] ingested ${hitCount} alert(s), ${newIps} new external IP(s) — tracking ${stats.tracked_ips} total.`);
        }
    } catch (err) {
        // Indexer not configured/unreachable — same as threatManagement.ts's loadAlerts, this
        // is an expected steady-state on a dev box without a live Wazuh indexer, not worth
        // more than a log line.
        console.error('[CTI Watcher] sync failed:', err instanceof Error ? err.message : err);
    }
}
