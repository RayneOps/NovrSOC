// GitLab API — search public repos for leaked code
// Free with GitLab.com account
// Get token: gitlab.com → User Settings → Access Tokens → scope: read_api
// Set: GITLAB_TOKEN=glpat_...

export interface GitLabCodeMatch {
    project: string;
    project_url: string;
    file_path: string;
    file_url: string;
    ref: string;
}

interface GitLabSearchItem {
    project_id?: number;
    path?: string;
    filename?: string;
    ref?: string;
}

function getToken(): string | null {
    const token = process.env.GITLAB_TOKEN;
    if (!token || token === 'REPLACE_WHEN_OBTAINED') return null;
    return token;
}

export async function searchCode(query: string): Promise<GitLabCodeMatch[]> {
    const token = getToken();
    if (!token) return [];

    try {
        const params = new URLSearchParams({ scope: 'blobs', search: query, per_page: '10' });
        const res = await fetch(`https://gitlab.com/api/v4/search?${params}`, {
            headers: { 'PRIVATE-TOKEN': token },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return [];
        const data = (await res.json()) as GitLabSearchItem[];

        return (data || []).map((item) => ({
            project: item.project_id?.toString() ?? 'unknown',
            project_url: `https://gitlab.com/projects/${item.project_id}`,
            file_path: item.path ?? item.filename ?? '',
            file_url: `https://gitlab.com/projects/${item.project_id}/-/blob/${item.ref}/${item.path}`,
            ref: item.ref ?? '',
        }));
    } catch {
        return [];
    }
}

export function isConfigured(): boolean {
    return !!getToken();
}
