import { Router } from 'express';
import multer from 'multer';
import {
    sendTestEmail,
    sendCriticalAlertEmail,
    sendWeeklyReportEmail,
    isEmailEnabled,
} from '../services/email';

const router = Router();

// Mailgun's inbound route POSTs multipart/form-data (fields + the DMARC XML/zip as a file
// attachment). express.json() (mounted globally in index.ts) can't parse that, so this route
// needs its own multipart parser. memoryStorage + a modest size cap — DMARC aggregate reports
// are small XML/gzip files, not the multi-MB uploads other routes (e.g. brand.ts) handle.
const dmarcUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/email/status
router.get('/status', (req, res) => {
    const hasResend = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'REPLACE_WHEN_OBTAINED');
    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const hasSendGrid = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'REPLACE_WHEN_OBTAINED');
    res.json({
        enabled: isEmailEnabled(),
        // Resend first — see services/email.ts's sendEmail() for why it's tried before SMTP
        // (Railway blocks outbound SMTP port 587, Resend is a plain HTTPS API call).
        provider: hasResend ? 'Resend' : hasSmtp ? 'Zoho SMTP' : hasSendGrid ? 'SendGrid' : 'none',
        from: process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'not configured',
        resend_configured: hasResend,
        smtp_configured: hasSmtp,
        sendgrid_configured: hasSendGrid,
    });
});

// POST /api/email/test
router.post('/test', async (req, res) => {
    const { to } = req.body ?? {};
    if (!to) {
        res.status(400).json({ error: 'to email required' });
        return;
    }
    try {
        await sendTestEmail(to);
        res.json({ success: true, message: `Test email sent to ${to}` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/email/alert
router.post('/alert', async (req, res) => {
    try {
        await sendCriticalAlertEmail(req.body ?? {});
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/email/weekly-report
router.post('/weekly-report', async (req, res) => {
    try {
        await sendWeeklyReportEmail(req.body ?? {});
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/email/dmarc-inbound (Mailgun inbound route webhook)
router.post('/dmarc-inbound', dmarcUpload.any(), async (req, res) => {
    try {
        const subject = req.body?.subject || '';
        const sender = req.body?.sender || '';
        const attachment = (req.files as Express.Multer.File[] | undefined)?.[0];

        console.log(`[DMARC] report received from ${sender}: ${subject}${attachment ? ` (attachment: ${attachment.originalname}, ${attachment.size}B)` : ' (no attachment)'}`);

        // TODO: unzip/parse the DMARC aggregate XML from `attachment.buffer` and store it in
        // a Supabase dmarc_reports table. Not implemented — logging receipt only for now.
        res.status(200).json({ success: true, message: 'DMARC report received' });
    } catch (err: any) {
        console.error('DMARC inbound error:', err);
        res.status(200).json({ success: true }); // Always 200 so Mailgun doesn't retry
    }
});

export default router;
