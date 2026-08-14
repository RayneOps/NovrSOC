// GitHub REST API — search public repos for leaked code, secrets, API keys
// Free: 30 req/min for code search (authenticated)
// Get token: github.com → Settings → Developer settings → Fine-grained tokens
// Set: GITHUB_TOKEN=ghp_...

export interface GitHubCodeMatch {
    repository: string;
    repo_url: string;
    file_path: string;
    file_url: string;
    matched_content: string; // deliberately redacted — never expose raw matched code in the UI
    score: number;
}

interface GitHubSearchItem {
    repository: { full_name: string; html_url: string };
    path: string;
    html_url: string;
    score: number;
}
interface GitHubSearchResponse {
    items?: GitHubSearchItem[];
}

function getToken(): string | null {
    const token = process.env.GITHUB_TOKEN;
    if (!token || token === 'REPLACE_WHEN_OBTAINED') return null;
    return token;
}

export async function searchCode(query: string, maxResults = 10): Promise<GitHubCodeMatch[]> {
    const token = getToken();
    if (!token) return [];

    try {
        const params = new URLSearchParams({ q: query, per_page: String(maxResults) });
        const res = await fetch(`https://api.github.com/search/code?${params}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (res.status === 403) {
            console.warn('[GitHub] Rate limited');
            return [];
        }
        if (!res.ok) return [];

        const data = (await res.json()) as GitHubSearchResponse;
        return (data.items || []).map((item) => ({
            repository: item.repository.full_name,
            repo_url: item.repository.html_url,
            file_path: item.path,
            file_url: item.html_url,
            matched_content: '[REDACTED — view on GitHub]',
            score: item.score,
        }));
    } catch {
        return [];
    }
}

export async function searchSecrets(orgName: string, additionalTerms: string[] = []): Promise<GitHubCodeMatch[]> {
    const token = getToken();
    if (!token) return [];

    const secretPatterns = [
        `${orgName} filename:.env`,
        `${orgName} AKIA`, // AWS keys
        `${orgName} sk-`, // OpenAI keys
        `${orgName} "api_key"`,
        ...additionalTerms.map((t) => `${orgName} ${t}`),
    ];

    const results: GitHubCodeMatch[] = [];
    for (const pattern of secretPatterns.slice(0, 3)) { // limit to 3 patterns on free tier
        const matches = await searchCode(pattern, 5);
        results.push(...matches);
        await new Promise((r) => setTimeout(r, 2000)); // respect rate limits
    }
    return results;
}

export function isConfigured(): boolean {
    return !!getToken();
}
