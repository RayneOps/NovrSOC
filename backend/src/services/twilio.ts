// Twilio SMS — send urgent alert SMS to on-call engineers
// ~$5/month — start with $15 free trial at: twilio.com/try-twilio
// Set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

interface TwilioCredentials {
    sid: string;
    token: string;
    from: string;
}

function getCredentials(): TwilioCredentials | null {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || sid === 'REPLACE_WHEN_OBTAINED') return null;
    if (!token || token === 'REPLACE_WHEN_OBTAINED') return null;
    if (!from || from === 'REPLACE_WHEN_OBTAINED') return null;
    return { sid, token, from };
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
    const creds = getCredentials();
    if (!creds) {
        console.warn('[Twilio] SMS credentials not configured');
        return false;
    }

    try {
        const body = new URLSearchParams({ To: to, From: creds.from, Body: message });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${creds.sid}:${creds.token}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            signal: AbortSignal.timeout(8000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function sendCriticalAlert(to: string, incidentTitle: string, severity: string): Promise<boolean> {
    const msg = `[NovrSOC] ${severity.toUpperCase()} ALERT: ${incidentTitle}. Login to NovrSOC immediately: app.novrsoc.com`;
    return sendSMS(to, msg);
}

export function isConfigured(): boolean {
    return !!getCredentials();
}
