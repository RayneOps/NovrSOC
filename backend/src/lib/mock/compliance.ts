// Copied from frontend/src/lib/mock/compliance.ts — only the FRAMEWORKS constant is needed
// here (consumed by the monthly report generator). Kept in sync manually; small enough that a
// shared package between the two independent projects isn't worth the tooling overhead.
export const FRAMEWORKS = [
    { name: 'NDPA', score: 88, status: 'Compliant', lastAssessed: '01 Jun 2026', nextAudit: '01 Jun 2027', color: '#22c55e' },
    { name: 'CBN Cybersecurity Framework', score: 91, status: 'Compliant', lastAssessed: '15 May 2026', nextAudit: '15 May 2027', color: '#22c55e' },
    { name: 'NCC Framework', score: 78, status: 'Partial', lastAssessed: '20 Apr 2026', nextAudit: '20 Oct 2026', color: '#eab308' },
    { name: 'ISO 27001', score: 85, status: 'Compliant', lastAssessed: '10 Jun 2026', nextAudit: '10 Jun 2027', color: '#22c55e' },
    { name: 'PCI-DSS', score: 92, status: 'Compliant', lastAssessed: '01 Jun 2026', nextAudit: '01 Jun 2027', color: '#22c55e' },
    { name: 'NIST CSF', score: 81, status: 'Compliant', lastAssessed: '25 May 2026', nextAudit: '25 May 2027', color: '#22c55e' },
    { name: 'SWIFT CSP', score: 74, status: 'Partial', lastAssessed: '01 Mar 2026', nextAudit: '01 Sep 2026', color: '#eab308' },
];
