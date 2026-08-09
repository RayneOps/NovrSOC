import { search } from './wazuh-indexer';

export interface WazuhAgent {
    id: string;
    name: string;
    status: string;
    os: string | null;
    ip: string | null;
    lastKeepAlive: string | null;
    group: string[];
}

interface MonitoringHit {
    _source: {
        id?: string;
        name?: string;
        status?: string;
        group?: string[];
        ip?: string;
        lastKeepAlive?: string;
        os?: { name?: string; version?: string };
    };
}

interface SearchResponse {
    aggregations?: { agents?: { buckets?: { key: string; latest?: { hits?: { hits?: MonitoringHit[] } } }[] } };
}

/**
 * Wazuh alert/vulnerability documents only carry agent.name / agent.id — there is no
 * agent.groups field to filter on directly. Group membership only exists in the
 * wazuh-monitoring-* index, so filtering "by group" is a two-step process: resolve the
 * group's agent names here first, then filter other indices by those names.
 *
 * Agent id "000" is the Wazuh manager itself (novrsoc-wazuh) and never appears in
 * wazuh-monitoring (it doesn't check in to itself). It always belongs to "default".
 */
export async function getAgentsForGroup(group: string | null): Promise<WazuhAgent[]> {
    const res = await search<SearchResponse>('wazuh-monitoring-*', {
        size: 0,
        aggs: {
            agents: {
                terms: { field: 'id', size: 200 },
                aggs: { latest: { top_hits: { size: 1, sort: [{ timestamp: { order: 'desc' } }] } } },
            },
        },
    });

    const buckets = res?.aggregations?.agents?.buckets ?? [];
    let agents: WazuhAgent[] = buckets
        .map((b) => b.latest?.hits?.hits?.[0]?._source)
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({
            id: a.id ?? '',
            name: a.name ?? 'Unknown',
            status: a.status ?? 'unknown',
            os: a.os?.name ? `${a.os.name} ${a.os.version ?? ''}`.trim() : null,
            ip: a.ip ?? null,
            lastKeepAlive: a.lastKeepAlive ?? null,
            group: a.group ?? [],
        }));

    if (group) {
        agents = agents.filter((a) => a.group.includes(group));
    }

    if (!group || group === 'default') {
        agents.unshift({
            id: '000', name: 'novrsoc-wazuh', status: 'active', os: 'Ubuntu 22.04 LTS',
            ip: null, lastKeepAlive: new Date().toISOString(), group: ['default'],
        });
    }
    return agents;
}

export async function getAgentNamesForGroup(group: string | null): Promise<string[]> {
    const agents = await getAgentsForGroup(group);
    return agents.map((a) => a.name);
}
