import { Router } from 'express';
import { sendSlackAlert, sendTestAlert, isConfigured as slackConfigured } from '../services/slack';
import { isConfigured as sendgridConfigured } from '../services/sendgrid';

const router = Router();

function envConfigured(name: string): boolean {
    const val = process.env[name];
    return !!val && val !== 'REPLACE_WHEN_OBTAINED';
}

// GET /api/alerts/status — check which channels are configured
router.get('/status', (_req, res) => {
    res.json({
        channels: {
            slack: { configured: slackConfigured(), name: 'Slack', description: '#novrsoc-alerts channel' },
            email: { configured: sendgridConfigured(), name: 'Email', description: 'SendGrid transactional email' },
            sms: { configured: envConfigured('TWILIO_ACCOUNT_SID'), name: 'SMS', description: 'Twilio SMS to on-call engineers' },
            pagerduty: { configured: envConfigured('PAGERDUTY_API_KEY'), name: 'PagerDuty', description: 'On-call schedule escalation' },
        },
    });
});

// POST /api/alerts/test — send test alert to all configured channels
router.post('/test', async (_req, res) => {
    const results: Record<string, boolean> = {};

    if (slackConfigured()) {
        results.slack = await sendTestAlert();
    }

    res.json({
        sent: results,
        message: Object.keys(results).length > 0 ? 'Test alerts sent to configured channels' : 'No alert channels configured yet',
    });
});

interface IncidentBody {
    title?: string;
    severity?: string;
    description?: string;
    affected_host?: string;
    incident_id?: string;
}

// POST /api/alerts/incident — dispatch a real incident alert
router.post('/incident', async (req, res) => {
    const { title, severity, description, affected_host, incident_id }: IncidentBody = req.body ?? {};
    if (!title || !severity) {
        res.status(400).json({ error: 'title and severity required' });
        return;
    }

    const incident = {
        incident_id: incident_id || `INC-${Date.now()}`,
        title,
        severity,
        description: description || title,
        affected_host: affected_host || 'unknown',
        detected_at: new Date().toLocaleString(),
    };

    const dispatched: string[] = [];

    if (slackConfigured()) {
        const sent = await sendSlackAlert(incident);
        if (sent) dispatched.push('slack');
    }

    res.json({
        dispatched,
        incident_id: incident.incident_id,
        message: dispatched.length > 0 ? `Alert dispatched via: ${dispatched.join(', ')}` : 'No channels configured — alert logged only',
    });
});

export default router;
