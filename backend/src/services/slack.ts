// Slack Incoming Webhook — post alert cards to SOC channel
// Free with any Slack workspace
// Get webhook: api.slack.com/apps → Incoming Webhooks
// Set: SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

function getWebhookUrl(): string | null {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url || url === 'REPLACE_WHEN_OBTAINED') return null;
    return url;
}

export interface SlackIncidentData {
    title: string;
    severity: string;
    description: string;
    affected_host: string;
    incident_id: string;
    detected_at: string;
}

export async function sendSlackAlert(incident: SlackIncidentData): Promise<boolean> {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
        console.warn('[Slack] Webhook not configured — alert not sent');
        return false;
    }

    const severityEmoji: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
    const severityColor: Record<string, string> = { critical: '#CC2B2B', high: '#FF6B35', medium: '#6B1FA8', low: '#7A8099' };
    const emoji = severityEmoji[incident.severity] ?? '⚪';
    const color = severityColor[incident.severity] ?? '#7A8099';

    const payload = {
        attachments: [{
            color,
            blocks: [
                { type: 'header', text: { type: 'plain_text', text: `${emoji} ${incident.severity.toUpperCase()} — ${incident.title}` } },
                { type: 'section', text: { type: 'mrkdwn', text: incident.description } },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*Incident ID*\n\`${incident.incident_id}\`` },
                        { type: 'mrkdwn', text: `*Affected Host*\n\`${incident.affected_host}\`` },
                        { type: 'mrkdwn', text: `*Detected*\n${incident.detected_at}` },
                        { type: 'mrkdwn', text: `*Severity*\n${incident.severity.toUpperCase()}` },
                    ],
                },
                {
                    type: 'actions',
                    elements: [
                        { type: 'button', text: { type: 'plain_text', text: 'View in NovrSOC' }, url: 'https://app.novrsoc.com/admin/secops/incidents', style: 'danger' },
                        { type: 'button', text: { type: 'plain_text', text: 'Acknowledge' }, url: 'https://app.novrsoc.com/admin/secops/incidents' },
                    ],
                },
            ],
        }],
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function sendTestAlert(): Promise<boolean> {
    return sendSlackAlert({
        title: 'NovrSOC Connected',
        severity: 'low',
        description: 'Alert Communication is configured and working.',
        affected_host: 'novrsoc-platform',
        incident_id: 'TEST-001',
        detected_at: new Date().toLocaleString(),
    });
}

export function isConfigured(): boolean {
    return !!getWebhookUrl();
}
