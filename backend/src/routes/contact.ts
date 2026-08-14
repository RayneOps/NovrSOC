import { Router } from 'express';

// Landing-page "Request a Demo" contact form. No CRM/email integration yet — submissions are
// kept in-memory (same pattern as routes/brand.ts) so the form is genuinely functional today;
// wire this up to a real inbox/CRM when one exists.

const router = Router();

interface ContactSubmission {
    id: string;
    name: string;
    email: string;
    company: string | null;
    message: string;
    submitted_at: string;
}

const submissions: ContactSubmission[] = [];
let nextId = 1;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', (req, res) => {
    const { name, email, company, message } = req.body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
        res.status(400).json({ error: 'a valid email is required' });
        return;
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'message is required' });
        return;
    }

    const submission: ContactSubmission = {
        id: String(nextId++),
        name: name.trim(),
        email: email.trim(),
        company: typeof company === 'string' && company.trim() ? company.trim() : null,
        message: message.trim(),
        submitted_at: new Date().toISOString(),
    };
    submissions.push(submission);
    console.log('[contact] New demo request:', submission.email, '-', submission.company ?? 'no company');

    res.status(201).json({ status: 'received' });
});

export default router;
