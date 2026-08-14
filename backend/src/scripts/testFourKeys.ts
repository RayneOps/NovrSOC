import 'dotenv/config';

interface GitHubUser {
    login: string;
    name: string | null;
}
interface GitHubSearchResponse {
    total_count: number;
}
interface GitLabUser {
    username: string;
    name: string;
}
interface NVDCVEResponse {
    vulnerabilities?: Array<{
        cve?: {
            metrics?: {
                cvssMetricV31?: Array<{ cvssData?: { baseScore?: number } }>;
            };
        };
    }>;
}

async function run() {
    console.log('\n=== Testing 4 New API Keys ===\n');

    // 1. Slack Webhook
    console.log('1. Slack Webhook...');
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackUrl || slackUrl === 'REPLACE_WHEN_OBTAINED') {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            const res = await fetch(slackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: '🚨 *NovrSOC Alert Communication* — Slack webhook verified and active. Platform connected.',
                    attachments: [{
                        color: '#2B3BCC',
                        fields: [
                            { title: 'Status', value: 'Connected ✅', short: true },
                            { title: 'Platform', value: 'NovrSOC by Cybernovr', short: true },
                        ],
                    }],
                }),
                signal: AbortSignal.timeout(8000),
            });
            if (res.ok) {
                console.log('   ✅ Slack: webhook verified — check your Slack channel for the test message');
            } else {
                console.log(`   ❌ Slack: HTTP ${res.status}`);
            }
        } catch (err) {
            console.log(`   ❌ Slack: ${err}`);
        }
    }

    // 2. GitLab
    console.log('\n2. GitLab...');
    const gitlabToken = process.env.GITLAB_TOKEN;
    if (!gitlabToken || gitlabToken === 'REPLACE_WHEN_OBTAINED') {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            const res = await fetch('https://gitlab.com/api/v4/user', {
                headers: { 'PRIVATE-TOKEN': gitlabToken },
                signal: AbortSignal.timeout(8000),
            });
            if (res.ok) {
                const user = (await res.json()) as GitLabUser;
                console.log(`   ✅ GitLab: authenticated as ${user.username} (${user.name})`);
            } else {
                console.log(`   ❌ GitLab: HTTP ${res.status}`);
            }
        } catch (err) {
            console.log(`   ❌ GitLab: ${err}`);
        }
    }

    // 3. GitHub
    console.log('\n3. GitHub...');
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken || githubToken === 'REPLACE_WHEN_OBTAINED') {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            const res = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                signal: AbortSignal.timeout(8000),
            });
            if (res.ok) {
                const user = (await res.json()) as GitHubUser;
                console.log(`   ✅ GitHub: authenticated as ${user.login} (${user.name})`);
                // Test code search
                const searchRes = await fetch('https://api.github.com/search/code?q=cybernovr+filename:.env&per_page=3', {
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                    signal: AbortSignal.timeout(10000),
                });
                if (searchRes.ok) {
                    const searchData = (await searchRes.json()) as GitHubSearchResponse;
                    console.log(`   ✅ GitHub code search: ${searchData.total_count} results for "cybernovr .env"`);
                } else {
                    console.log(`   ⚠️  GitHub code search: HTTP ${searchRes.status}`);
                }
            } else {
                console.log(`   ❌ GitHub: HTTP ${res.status}`);
            }
        } catch (err) {
            console.log(`   ❌ GitHub: ${err}`);
        }
    }

    // 4. NVD API
    console.log('\n4. NVD (NIST) API...');
    const nvdKey = process.env.NVD_API_KEY;
    if (!nvdKey || nvdKey === 'REPLACE_WHEN_OBTAINED' || nvdKey === 'REPLACE_WITH_REAL_KEY') {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            const start = Date.now();
            const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228', {
                headers: { apiKey: nvdKey },
                signal: AbortSignal.timeout(15000),
            });
            const elapsed = Date.now() - start;
            if (res.ok) {
                const data = (await res.json()) as NVDCVEResponse;
                const cve = data.vulnerabilities?.[0]?.cve;
                const score = cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore;
                console.log(`   ✅ NVD: authenticated — Log4Shell CVE-2021-44228 CVSS: ${score} (fetched in ${elapsed}ms)`);
                console.log(`   Response time with real key: ${elapsed}ms (vs ~3000ms unauthenticated)`);
            } else {
                console.log(`   ❌ NVD: HTTP ${res.status}`);
            }
        } catch (err) {
            console.log(`   ❌ NVD: ${err}`);
        }
    }

    console.log('\n=== Done ===\n');
}

run().catch(console.error);
