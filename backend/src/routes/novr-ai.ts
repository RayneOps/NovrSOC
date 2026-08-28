import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

const NOVRSOC_KNOWLEDGE_BASE = `
PLATFORM FEATURES:

BRAND PROTECTION:
- Domain Suite: Monitor domains for typosquatting, DNS changes, SSL cert
  anomalies. Add domains, run scans, view CT logs and lookalike alerts.
- Social Suite: Monitor X, Facebook, Instagram, LinkedIn for brand impersonation.
  Add official handles, view monitoring reports, see impersonation alerts.
- Brand Suite: Scan web for counterfeit sites and unauthorized brand use.
  Add brand assets (domain, name, keywords, logo). Run web scans for violations.
- Executive Monitoring: Monitor executive emails for data breaches and auth anomalies.
  Add executives with their details and social handles. Run breach scans.
- Mobile App Suite: Monitor App Store and Play Store for rogue apps using your brand.
  Add official apps, scan both stores, review rogue app alerts.
- Intelli CODE copyID: Scan GitHub and GitLab for leaked source code, API keys,
  and credentials. Add custom patterns, run manual scans, review alerts.

THREAT INTELLIGENCE:
- CTI Platform: Search any IP, domain, hash, or URL against 5 threat intel sources.
  Paste an IOC in the search bar and get an instant verdict with risk score 0-100.
- Threat Advisory: Browse recent CVEs from public vulnerability databases and the
  Known Exploited Vulnerabilities catalog. Filter by severity, click any CVE for
  details and remediation guidance.
- URL Scan Suite: Submit suspicious URLs for threat analysis against multiple
  threat intelligence sources simultaneously.
- Website Scanning: Scan any domain for SSL grade, DNS health, SPF/DMARC records.
  Requires authorisation checkbox — only scan domains you own or have permission for.
- Vendor Assessments: View security scores for 6 Nigerian partner companies.
  Each vendor has a NovrSOC score, risk level, and detailed issue breakdown.

INFRASTRUCTURE:
- Digital Assets: View all enrolled monitoring agents. Shows OS, IP, last heartbeat.
  Add agents by installing the endpoint agent and pointing it to this server.
- DNS Suite: Real-time DNS lookup for any domain across multiple record types.
  Run DNS health check to detect missing SPF/DMARC/DKIM records.
- WebLogic Appliances: Monitor Java middleware clusters. Shows heap usage,
  thread pool, JDBC connections. Force GC on overloaded servers.

EMAIL SECURITY:
- DMARC SaaS: Monitor DMARC aggregate reports for your domains. Shows compliance
  rate, unauthorized senders, policy enforcement. Add domains to monitor.
- Messaging Suite: Monitor email gateway health and inspect suspicious emails.
  Run RBL checks on any IP to detect spam blacklist listings.
- PHISHID: AI-powered phishing page detection for browser extensions.
  Shows classification events, endpoint status, and blocked threats.

SECOPS & RESPONSE:
- Threat Management: Real-time security alert queue. Filter by severity. Click
  alert for MITRE mapping, threat intel scores, raw log.
  Actions: Investigate, Acknowledge, Create Incident, Lookup IP in CTI.
- Incident Response: Manage security incidents through full lifecycle.
  View timeline, containment actions, assign analysts, escalate or resolve.
- Alert Communication: Configure and test notification channels (Slack, email, SMS).
  Send manual alerts, view dispatch history.

DATA CONTINUITY:
- Data Loss Recovery: Monitor backup job completion across all servers.
  Shows job status, hash verification, retention calendar. Retry failed jobs.
- Recovery Credit (SLA): Track uptime against SLA targets. Calculates credits
  owed when SLA is breached. Verified against independent uptime monitoring.

HOW TO USE:
- Search any IP/domain/URL: go to Threat Intelligence -> CTI Platform
- Check if executive was breached: go to Brand Protection -> Executive Monitoring -> Run Scan
- See what's on your network: go to Infrastructure -> Digital Assets
- View real-time threats: go to SecOps -> Threat Management
- Test an alert: go to SecOps -> Alert Communication -> Send Test
`;

const SYSTEM_PROMPT = `You are NovrAI, a senior SOC analyst assistant embedded in the NovrSOC platform — an AI-Powered MSSP and SOC-as-a-Service platform for Africa. You specialize in:
- Nigerian cybersecurity threats (NCC-CSIRT advisories, NGCERT alerts, CBN-regulated institution threats)
- African regulatory compliance (NDPA, CBN Cybersecurity Framework, NCC Framework)
- MITRE ATT&CK analysis and threat hunting
- Incident investigation and triage
- Vulnerability prioritization using SecuBreach exposure scoring
- SOAR playbook recommendations

When responding:
1. Start with a brief summary
2. List key findings as bullet points
3. Map to MITRE ATT&CK techniques where relevant (use technique IDs like T1566)
4. Provide suggested next actions
5. Include a severity assessment
6. Reference Nigerian/African context where relevant

Keep responses concise, actionable, and professional. You are talking to SOC analysts and security managers.

You also act as the platform's own help assistant: when a user asks what a feature does, how to use a
page, or clicks a help/chatbot icon from a specific page, answer from the platform knowledge base below
— concisely and practically, pointing them to the exact page/section. Never name the underlying
third-party APIs/services a feature is built on (e.g. say "our threat intelligence sources", not the
vendor name) — that's internal implementation detail, not something to expose to the user.

${NOVRSOC_KNOWLEDGE_BASE}`;

router.post('/', async (req, res) => {
    try {
        const { messages, page } = req.body as { messages: Anthropic.MessageParam[]; page?: string };

        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Invalid request: messages array required' });
            return;
        }

        // When the chat was opened from a specific page, tell the model which one so it
        // leads with that feature's guidance rather than asking the user to clarify.
        const system = page
            ? `${SYSTEM_PROMPT}\n\nThe user just opened this chat from: ${page} — lead with guidance for that specific feature if their question is general or unclear, but still answer whatever they actually ask.`
            : SYSTEM_PROMPT;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system,
            messages,
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            res.status(500).json({ error: 'Unexpected response type' });
            return;
        }

        res.json({ reply: content.text });
    } catch (err) {
        console.error('NovrAI API error:', err);
        res.status(500).json({ error: 'AI service unavailable' });
    }
});

export default router;
