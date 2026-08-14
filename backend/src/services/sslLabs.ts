// SSL Labs API — TLS/SSL grade assessment
// Free, no key needed

const SSL_BASE = 'https://api.ssllabs.com/api/v3';

export interface SSLGrade {
    grade: string;         // A+ A A- B C D E F T M X
    hasWarnings: boolean;
    isExceptional: boolean;
    ipAddress: string;
}

export interface SSLReport {
    host: string;
    status: string;        // DNS | ERROR | IN_PROGRESS | READY
    startTime: number;
    endpoints: SSLGrade[];
    bestGrade: string;
}

interface SSLLabsRawEndpoint {
    ipAddress: string;
    grade?: string;
    hasWarnings?: boolean;
    isExceptional?: boolean;
}

interface SSLLabsRawResponse {
    host: string;
    status: string;
    startTime: number;
    endpoints?: SSLLabsRawEndpoint[];
}

// Start or get a cached SSL analysis
export async function analyzeSSL(host: string, forceNew = false): Promise<SSLReport | null> {
    try {
        const params = new URLSearchParams({
            host,
            all: 'done',
            ...(forceNew ? { startNew: 'on' } : { fromCache: 'on', maxAge: '24' }),
        });

        const res = await fetch(`${SSL_BASE}/analyze?${params}`, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const data = (await res.json()) as SSLLabsRawResponse;

        if (data.status === 'ERROR') return null;

        const endpoints: SSLGrade[] = (data.endpoints || []).map((ep) => ({
            grade: ep.grade || 'T',
            hasWarnings: ep.hasWarnings || false,
            isExceptional: ep.isExceptional || false,
            ipAddress: ep.ipAddress,
        }));

        const grades = endpoints.map((e) => e.grade).filter(Boolean);
        const bestGrade = grades.sort()[0] || 'Unknown';

        return { host: data.host, status: data.status, startTime: data.startTime, endpoints, bestGrade };
    } catch {
        return null;
    }
}

// Poll until analysis is complete (SSL Labs takes 60-90 seconds)
export async function analyzeSSLWithWait(host: string): Promise<SSLReport | null> {
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        const result = await analyzeSSL(host);
        if (!result) return null;
        if (result.status === 'READY') return result;
        if (result.status === 'ERROR') return null;

        attempts++;
        await new Promise((r) => setTimeout(r, 10000)); // wait 10 seconds
    }

    return null;
}
