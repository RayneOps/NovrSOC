// SendGrid transactional email — rich HTML templates for alerts, weekly reports,
// incident resolutions, and client onboarding.
//
// This is deliberately separate from services/sendgrid.ts (which stays wired to the
// existing /api/alerts/incident flow with its plainer template) so that flow keeps working
// unchanged while this one grows the fuller notification set. Consider consolidating later.
//
// Note: the HTML templates below use raw brand hexes deliberately — email clients don't
// reliably support CSS custom properties, so inline hex is correct here (unlike app JSX,
// where this codebase uses token classes throughout).

import sgMail from '@sendgrid/mail';

const FROM = {
    email: process.env.SENDGRID_FROM_EMAIL || 'alerts@novrsoc.com',
    name: process.env.SENDGRID_FROM_NAME || 'NovrSOC by Cybernovr',
};

let initialized = false;
function ensureInitialized(): void {
    if (initialized) return;
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'REPLACE_WHEN_OBTAINED') {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    initialized = true;
}

export function isEmailEnabled(): boolean {
    const key = process.env.SENDGRID_API_KEY;
    return !!(key && key !== 'REPLACE_WHEN_OBTAINED' && process.env.EMAIL_ENABLED === 'true');
}

// ─── BASE HTML TEMPLATE ──────────────────────────────────────────────────────

function baseTemplate(title: string, preheader: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,-apple-system,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#520385;">
    <tr>
      <td style="padding:20px 32px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="width:28px;height:28px;background:#FF5500;border-radius:6px;
                          display:inline-block;vertical-align:middle;margin-right:10px;"></div>
              <span style="color:white;font-size:18px;font-weight:900;
                           letter-spacing:-0.5px;vertical-align:middle;">NovrSOC</span>
              <span style="color:rgba(255,255,255,0.5);font-size:11px;
                           margin-left:6px;vertical-align:middle;">by Cybernovr</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:white;border-radius:12px;
                      border:1px solid #EEF0F6;overflow:hidden;">
          ${body}
        </table>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:0 16px 32px;">
        <table width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="color:#7A8099;font-size:11px;margin:0;">
                NovrSOC by Cybernovr · Lagos, Nigeria<br/>
                <a href="https://socnovr.vercel.app" style="color:#520385;">socnovr.vercel.app</a>
                &nbsp;·&nbsp;
                <a href="https://socnovr.vercel.app/unsubscribe" style="color:#7A8099;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ─── EMAIL TYPES ──────────────────────────────────────────────────────────────

// 1. CRITICAL ALERT EMAIL
export async function sendCriticalAlertEmail(params: {
    to: string[];
    alertTitle: string;
    severity: string;
    agentName: string;
    sourceIp: string;
    mitreId: string;
    mitreTactic: string;
    riskScore: number;
    incidentId?: string;
    rawLog?: string;
}): Promise<void> {
    if (!isEmailEnabled()) return;
    ensureInitialized();

    const severityColor = {
        critical: '#CC2B2B',
        high: '#FF5500',
        medium: '#F59E0B',
        low: '#2B3BCC',
    }[params.severity.toLowerCase()] || '#520385';

    const alertTitle = escapeHtml(params.alertTitle);
    const agentName = escapeHtml(params.agentName);
    const sourceIp = escapeHtml(params.sourceIp || 'Internal');
    const mitreId = escapeHtml(params.mitreId);
    const mitreTactic = escapeHtml(params.mitreTactic);
    const rawLog = params.rawLog ? escapeHtml(params.rawLog) : '';

    const body = `
    <!-- Severity banner -->
    <tr>
      <td style="background:${severityColor};padding:16px 32px;">
        <p style="color:white;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1px;margin:0;">
          ${escapeHtml(params.severity.toUpperCase())} SEVERITY ALERT
        </p>
      </td>
    </tr>

    <!-- Alert title -->
    <tr>
      <td style="padding:32px 32px 16px;">
        <h1 style="color:#1C1F2E;font-size:22px;font-weight:900;
                   margin:0 0 8px;letter-spacing:-0.5px;">
          ${alertTitle}
        </h1>
        <p style="color:#7A8099;font-size:13px;margin:0;">
          Detected by NovrSOC · ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })} WAT
        </p>
      </td>
    </tr>

    <!-- Stats grid -->
    <tr>
      <td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#F8F9FC;border-radius:8px;border:1px solid #EEF0F6;">
          <tr>
            <td style="padding:16px;border-right:1px solid #EEF0F6;width:25%;">
              <p style="color:#7A8099;font-size:10px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
                Risk Score
              </p>
              <p style="color:${severityColor};font-size:24px;font-weight:900;margin:0;">
                ${params.riskScore}/100
              </p>
            </td>
            <td style="padding:16px;border-right:1px solid #EEF0F6;width:25%;">
              <p style="color:#7A8099;font-size:10px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
                Affected Host
              </p>
              <p style="color:#1C1F2E;font-size:14px;font-weight:700;margin:0;">
                ${agentName}
              </p>
            </td>
            <td style="padding:16px;border-right:1px solid #EEF0F6;width:25%;">
              <p style="color:#7A8099;font-size:10px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
                Source IP
              </p>
              <p style="color:#1C1F2E;font-size:14px;font-weight:700;margin:0;
                        font-family:monospace;">
                ${sourceIp}
              </p>
            </td>
            <td style="padding:16px;width:25%;">
              <p style="color:#7A8099;font-size:10px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
                MITRE ATT&amp;CK
              </p>
              <p style="color:#520385;font-size:12px;font-weight:700;margin:0;">
                ${mitreId}<br/>
                <span style="font-weight:400;color:#7A8099;">${mitreTactic}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${rawLog ? `
    <!-- Raw log -->
    <tr>
      <td style="padding:0 32px 24px;">
        <p style="color:#7A8099;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">
          Raw Alert
        </p>
        <div style="background:#1C1F2E;border-radius:8px;padding:16px;
                    font-family:monospace;font-size:11px;color:#E0E0E0;
                    overflow:hidden;word-break:break-all;">
          ${rawLog.substring(0, 500)}${rawLog.length > 500 ? '...' : ''}
        </div>
      </td>
    </tr>` : ''}

    <!-- CTA -->
    <tr>
      <td style="padding:0 32px 32px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#520385;border-radius:8px;">
              <a href="https://socnovr.vercel.app/admin/secops/threats"
                 style="color:white;font-size:13px;font-weight:700;
                        text-decoration:none;padding:12px 24px;display:inline-block;">
                View Alert in NovrSOC →
              </a>
            </td>
            ${params.incidentId ? `
            <td style="padding-left:12px;">
              <a href="https://socnovr.vercel.app/admin/secops/incidents"
                 style="color:#520385;font-size:13px;font-weight:700;
                        text-decoration:none;padding:12px 24px;display:inline-block;
                        border:1px solid #520385;border-radius:8px;">
                View Incident
              </a>
            </td>` : ''}
          </tr>
        </table>
      </td>
    </tr>
  `;

    await sgMail.send({
        to: params.to,
        from: FROM,
        subject: `[NovrSOC ${params.severity.toUpperCase()}] ${params.alertTitle}`,
        html: baseTemplate(
            `NovrSOC Alert: ${alertTitle}`,
            `${params.severity.toUpperCase()} severity alert detected on ${params.agentName}`,
            body
        ),
    });
}

// 2. WEEKLY SECURITY REPORT EMAIL
export async function sendWeeklyReportEmail(params: {
    to: string[];
    orgName: string;
    weekStart: string;
    weekEnd: string;
    totalAlerts: number;
    criticalCount: number;
    highCount: number;
    resolvedCount: number;
    complianceScore: number;
    complianceChange: number;
    topThreats: Array<{ name: string; count: number }>;
    slaUptime: number;
    backupStatus: string;
    openIncidents: number;
}): Promise<void> {
    if (!isEmailEnabled()) return;
    ensureInitialized();

    const orgName = escapeHtml(params.orgName);

    const body = `
    <!-- Week header -->
    <tr>
      <td style="padding:32px 32px 8px;">
        <p style="color:#7A8099;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">
          Weekly Security Report
        </p>
        <h1 style="color:#1C1F2E;font-size:24px;font-weight:900;
                   margin:0 0 4px;letter-spacing:-0.5px;">
          ${orgName}
        </h1>
        <p style="color:#7A8099;font-size:13px;margin:0;">
          ${escapeHtml(params.weekStart)} — ${escapeHtml(params.weekEnd)}
        </p>
      </td>
    </tr>

    <!-- KPI row -->
    <tr>
      <td style="padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border:1px solid #EEF0F6;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:16px;text-align:center;border-right:1px solid #EEF0F6;">
              <p style="color:#CC2B2B;font-size:28px;font-weight:900;margin:0;">
                ${params.criticalCount}
              </p>
              <p style="color:#7A8099;font-size:10px;text-transform:uppercase;
                        letter-spacing:1px;margin:4px 0 0;font-weight:700;">
                Critical
              </p>
            </td>
            <td style="padding:16px;text-align:center;border-right:1px solid #EEF0F6;">
              <p style="color:#FF5500;font-size:28px;font-weight:900;margin:0;">
                ${params.highCount}
              </p>
              <p style="color:#7A8099;font-size:10px;text-transform:uppercase;
                        letter-spacing:1px;margin:4px 0 0;font-weight:700;">
                High
              </p>
            </td>
            <td style="padding:16px;text-align:center;border-right:1px solid #EEF0F6;">
              <p style="color:#16A34A;font-size:28px;font-weight:900;margin:0;">
                ${params.resolvedCount}
              </p>
              <p style="color:#7A8099;font-size:10px;text-transform:uppercase;
                        letter-spacing:1px;margin:4px 0 0;font-weight:700;">
                Resolved
              </p>
            </td>
            <td style="padding:16px;text-align:center;">
              <p style="color:#520385;font-size:28px;font-weight:900;margin:0;">
                ${params.complianceScore}%
              </p>
              <p style="color:#7A8099;font-size:10px;text-transform:uppercase;
                        letter-spacing:1px;margin:4px 0 0;font-weight:700;">
                Compliance
                ${params.complianceChange >= 0
            ? `<span style="color:#16A34A;">▲${params.complianceChange}%</span>`
            : `<span style="color:#CC2B2B;">▼${Math.abs(params.complianceChange)}%</span>`
        }
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Top threats -->
    <tr>
      <td style="padding:0 32px 24px;">
        <p style="color:#1C1F2E;font-size:14px;font-weight:700;margin:0 0 12px;">
          Top Threats This Week
        </p>
        ${params.topThreats.slice(0, 5).map(t => `
        <div style="display:flex;justify-content:space-between;
                    padding:8px 0;border-bottom:1px solid #EEF0F6;">
          <span style="color:#1C1F2E;font-size:13px;">${escapeHtml(t.name)}</span>
          <span style="color:#520385;font-size:13px;font-weight:700;">${t.count}</span>
        </div>`).join('')}
      </td>
    </tr>

    <!-- SLA + Backup -->
    <tr>
      <td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48%" style="background:#F5F0FF;border-radius:8px;padding:16px;">
              <p style="color:#7A8099;font-size:10px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
                Uptime SLA
              </p>
              <p style="color:#520385;font-size:24px;font-weight:900;margin:0;">
                ${params.slaUptime}%
              </p>
            </td>
            <td width="4%"></td>
            <td width="48%"
                style="background:${params.backupStatus === 'All Successful' ? '#F0FDF4' : '#FFF4EE'};
                       border-radius:8px;padding:16px;">
              <p style="color:#7A8099;font-size:10px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
                Backup Status
              </p>
              <p style="color:${params.backupStatus === 'All Successful' ? '#16A34A' : '#FF5500'};
                        font-size:16px;font-weight:900;margin:0;">
                ${escapeHtml(params.backupStatus)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:0 32px 32px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#FF5500;border-radius:8px;">
              <a href="https://socnovr.vercel.app/admin/dashboard"
                 style="color:white;font-size:13px;font-weight:700;
                        text-decoration:none;padding:12px 24px;display:inline-block;">
                View Full Report →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

    await sgMail.send({
        to: params.to,
        from: FROM,
        subject: `NovrSOC Weekly Report — ${params.orgName} — w/c ${params.weekStart}`,
        html: baseTemplate(
            `NovrSOC Weekly Security Report — ${orgName}`,
            `${params.totalAlerts} alerts this week · ${params.complianceScore}% compliance`,
            body
        ),
    });
}

// 3. INCIDENT RESOLVED EMAIL
export async function sendIncidentResolvedEmail(params: {
    to: string[];
    incidentId: string;
    title: string;
    severity: string;
    resolvedBy: string;
    duration: string;
    rootCause: string;
    containment: string[];
}): Promise<void> {
    if (!isEmailEnabled()) return;
    ensureInitialized();

    const title = escapeHtml(params.title);
    const incidentId = escapeHtml(params.incidentId);
    const resolvedBy = escapeHtml(params.resolvedBy);

    const body = `
    <tr>
      <td style="background:#16A34A;padding:16px 32px;">
        <p style="color:white;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1px;margin:0;">
          ✓ Incident Resolved
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h1 style="color:#1C1F2E;font-size:20px;font-weight:900;margin:0 0 4px;">
          ${incidentId}: ${title}
        </h1>
        <p style="color:#7A8099;font-size:13px;margin:0 0 24px;">
          Resolved by ${resolvedBy} · Duration: ${escapeHtml(params.duration)}
        </p>
        <p style="color:#7A8099;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">
          Root Cause
        </p>
        <p style="color:#1C1F2E;font-size:13px;margin:0 0 24px;">
          ${escapeHtml(params.rootCause)}
        </p>
        <p style="color:#7A8099;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">
          Containment Actions Completed
        </p>
        ${params.containment.map(a => `
        <p style="color:#1C1F2E;font-size:13px;margin:0 0 4px;">
          ✓ ${escapeHtml(a)}
        </p>`).join('')}
        <br/>
        <a href="https://socnovr.vercel.app/admin/secops/incidents"
           style="background:#520385;color:white;font-size:13px;font-weight:700;
                  text-decoration:none;padding:12px 24px;border-radius:8px;
                  display:inline-block;margin-top:8px;">
          View Full Incident Report →
        </a>
      </td>
    </tr>
  `;

    await sgMail.send({
        to: params.to,
        from: FROM,
        subject: `[RESOLVED] ${params.incidentId} — ${params.title}`,
        html: baseTemplate(
            `Incident Resolved: ${title}`,
            `${incidentId} has been resolved by ${params.resolvedBy}`,
            body
        ),
    });
}

// 4. CLIENT ONBOARDING EMAIL
export async function sendOnboardingEmail(params: {
    to: string;
    clientName: string;
    orgName: string;
    loginUrl: string;
}): Promise<void> {
    if (!isEmailEnabled()) return;
    ensureInitialized();

    const clientName = escapeHtml(params.clientName);
    const orgName = escapeHtml(params.orgName);

    const body = `
    <tr>
      <td style="background:#520385;padding:32px;">
        <h1 style="color:white;font-size:28px;font-weight:900;
                   margin:0 0 8px;letter-spacing:-0.5px;">
          Welcome to NovrSOC
        </h1>
        <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">
          Your Security Operations Centre is now active
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="color:#1C1F2E;font-size:15px;margin:0 0 24px;">
          Hi ${clientName},
        </p>
        <p style="color:#1C1F2E;font-size:15px;margin:0 0 24px;">
          ${orgName} is now protected by NovrSOC. Your security dashboard
          is live and monitoring has begun.
        </p>

        <div style="background:#F5F0FF;border-radius:8px;padding:20px;margin:0 0 24px;">
          <p style="color:#520385;font-size:13px;font-weight:700;margin:0 0 12px;">
            Your next steps:
          </p>
          <p style="color:#1C1F2E;font-size:13px;margin:0 0 8px;">
            1. Log in to your dashboard at the link below
          </p>
          <p style="color:#1C1F2E;font-size:13px;margin:0 0 8px;">
            2. Add your domains for monitoring (Brand Protection → Domain Suite)
          </p>
          <p style="color:#1C1F2E;font-size:13px;margin:0 0 8px;">
            3. Add your executive team (Brand Protection → Executive Monitoring)
          </p>
          <p style="color:#1C1F2E;font-size:13px;margin:0;">
            4. Install the Wazuh agent on your servers and laptops
          </p>
        </div>

        <a href="${params.loginUrl}"
           style="background:#FF5500;color:white;font-size:14px;font-weight:700;
                  text-decoration:none;padding:14px 32px;border-radius:8px;
                  display:inline-block;">
          Access Your Dashboard →
        </a>
      </td>
    </tr>
  `;

    await sgMail.send({
        to: params.to,
        from: FROM,
        subject: `Welcome to NovrSOC — ${params.orgName} is now protected`,
        html: baseTemplate(
            'Welcome to NovrSOC',
            'Your Security Operations Centre is now active and monitoring has begun',
            body
        ),
    });
}

// 5. TEST EMAIL
export async function sendTestEmail(to: string): Promise<void> {
    if (!isEmailEnabled()) throw new Error('Email not configured');
    ensureInitialized();

    await sgMail.send({
        to,
        from: FROM,
        subject: '[NovrSOC] Test Email — Email alerts are working',
        html: baseTemplate(
            'NovrSOC Test Email',
            'Email delivery confirmed',
            `
      <tr>
        <td style="padding:32px;text-align:center;">
          <div style="width:48px;height:48px;background:#F5F0FF;border-radius:50%;
                      margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">✓</span>
          </div>
          <h2 style="color:#1C1F2E;font-size:20px;font-weight:900;margin:0 0 8px;">
            Email is working
          </h2>
          <p style="color:#7A8099;font-size:13px;margin:0;">
            NovrSOC email alerts are configured correctly.
            You will receive security alerts at this address.
          </p>
        </td>
      </tr>
      `
        ),
    });
}
