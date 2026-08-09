export const FRAMEWORKS = [
    { name: 'NDPA', score: 88, status: 'Compliant', lastAssessed: '01 Jun 2026', nextAudit: '01 Jun 2027', color: '#16A34A' },
    { name: 'CBN Cybersecurity Framework', score: 91, status: 'Compliant', lastAssessed: '15 May 2026', nextAudit: '15 May 2027', color: '#16A34A' },
    { name: 'NCC Framework', score: 78, status: 'Partial', lastAssessed: '20 Apr 2026', nextAudit: '20 Oct 2026', color: '#D97706' },
    { name: 'ISO 27001', score: 85, status: 'Compliant', lastAssessed: '10 Jun 2026', nextAudit: '10 Jun 2027', color: '#16A34A' },
    { name: 'PCI-DSS', score: 92, status: 'Compliant', lastAssessed: '01 Jun 2026', nextAudit: '01 Jun 2027', color: '#16A34A' },
    { name: 'NIST CSF', score: 81, status: 'Compliant', lastAssessed: '25 May 2026', nextAudit: '25 May 2027', color: '#16A34A' },
    { name: 'SWIFT CSP', score: 74, status: 'Partial', lastAssessed: '01 Mar 2026', nextAudit: '01 Sep 2026', color: '#D97706' },
];

export const CBN_CONTROLS = [
    { control: 'Incident Reporting SLA Compliance', status: 'Compliant' },
    { control: 'Data Breach Notification (72hr rule)', status: 'Compliant' },
    { control: 'Access Control Audit', status: 'Partial' },
    { control: 'Patch Management', status: 'Partial' },
    { control: 'Third-Party Risk Assessment', status: 'Non-compliant' },
    { control: 'Business Continuity Testing', status: 'Compliant' },
    { control: 'Privileged Access Management', status: 'Compliant' },
];

export const NDPA_ITEMS = [
    { item: 'Data Processing Records', status: 'Complete', note: '' },
    { item: 'Data Subject Rights Management', status: 'Partial', note: '2 pending requests' },
    { item: 'NITDA Registration Status', status: 'Complete', note: 'Registered' },
    { item: 'Privacy Policy Last Updated', status: 'Partial', note: 'Due for review' },
    { item: 'Breach Notification Log', status: 'Complete', note: '0 reportable breaches' },
];

export const COMPLIANCE_TIMELINE = [
    { date: '30 Jun 2026', event: 'NCC quarterly report due', urgency: 'urgent' },
    { date: '15 Jul 2026', event: 'ISO 27001 surveillance audit', urgency: 'upcoming' },
    { date: '01 Sep 2026', event: 'CBN annual assessment', urgency: 'upcoming' },
    { date: '01 Sep 2026', event: 'SWIFT CSP reassessment', urgency: 'upcoming' },
    { date: '15 Sep 2026', event: 'NDPA annual review', urgency: 'future' },
    { date: '01 Oct 2026', event: 'PCI-DSS recertification', urgency: 'future' },
];
