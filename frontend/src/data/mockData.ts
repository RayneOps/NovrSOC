export interface MetricItem {
    value: string;
    trend: string;
    type: 'blue' | 'purple' | 'orange' | 'red';
    label: string;
}

// 1. COMBINED ROLE AND SERVICE DASHBOARD METRICS
export const globalMetrics: Record<string, Record<string, MetricItem>> = {
    general: {
        totalAssets: { value: "1,420", trend: "+4.2%", type: "blue", label: "Total Assets" },
        activeThreats: { value: "14", trend: "-12.5%", type: "orange", label: "Active Threats" },
        criticalAlerts: { value: "3", trend: "+50%", type: "purple", label: "Critical Alerts" },
        openIncidents: { value: "8", trend: "0%", type: "orange", label: "Open Incidents" },
        riskScore: { value: "68/100", trend: "-2.1%", type: "blue", label: "Risk Score" },
        vendorRisk: { value: "Low", trend: "Stable", type: "blue", label: "Vendor Risk" }
    },
    executive: {
        enterpriseRisk: { value: "24/100", trend: "-5.4%", type: "blue", label: "Enterprise Risk Score" },
        threatExposure: { value: "Minimal", trend: "Stable", type: "blue", label: "Threat Exposure" },
        criticalIncidents: { value: "0", trend: "-100%", type: "blue", label: "Critical Incidents" },
        protectedAssets: { value: "4,850", trend: "+12%", type: "purple", label: "Protected Assets" },
        thirdPartyRisk: { value: "Medium", trend: "+1.2%", type: "orange", label: "Third-Party Risk" },
        complianceScore: { value: "94.2%", trend: "+3.5%", type: "blue", label: "Compliance Score" }
    },
    socManager: {
        openIncidents: { value: "12", trend: "+2", type: "orange", label: "Open Incidents" },
        analystUtilization: { value: "74%", trend: "Optimal", type: "blue", label: "Analyst Utilization" },
        slaCompliance: { value: "98.4%", trend: "+0.6%", type: "blue", label: "SLA Compliance" },
        escalations: { value: "2", trend: "-1", type: "purple", label: "Escalations" },
        mttd: { value: "4.2m", trend: "-1.1m", type: "blue", label: "Mean Time To Detect" },
        mttr: { value: "18.5m", trend: "-4.3m", type: "blue", label: "Mean Time To Respond" }
    },
    socAnalyst: {
        assignedCases: { value: "4", trend: "Active", type: "blue", label: "Assigned Cases" },
        openAlerts: { value: "42", trend: "+5 new", type: "orange", label: "Open Alerts" },
        investigations: { value: "2", trend: "In-Progress", type: "purple", label: "Investigations" },
        iocMatches: { value: "128", trend: "+14", type: "purple", label: "IOC Matches" },
        escalations: { value: "1", trend: "Pending", type: "orange", label: "Escalations" },
        resolvedToday: { value: "19", trend: "Completed", type: "blue", label: "Resolved Today" }
    }
};

// 2. NEW EXTENDED PLATFORM-LEVEL DASHBOARD METRICS
export const extendedPlatformMetrics: Record<string, Record<string, MetricItem>> = {
    compliance: {
        score: { value: "91.4%", trend: "+2.1%", type: "blue", label: "Compliance Score" },
        coverage: { value: "88.2%", trend: "Stable", type: "blue", label: "Control Coverage" },
        failed: { value: "14", trend: "-4", type: "orange", label: "Failed Controls" },
        findings: { value: "6", trend: "Open", type: "purple", label: "Audit Findings" },
        trend: { value: "Upward", trend: "+3.5%", type: "blue", label: "Compliance Trend" },
        remediation: { value: "82%", trend: "In Progress", type: "purple", label: "Remediation Status" }
    },
    soar: {
        executed: { value: "12,450", trend: "+1,200", type: "blue", label: "Playbooks Executed" },
        successRate: { value: "99.82%", trend: "Optimal", type: "blue", label: "Automation Success" },
        timeSaved: { value: "342 hrs", trend: "This Month", type: "purple", label: "Estimated Time Saved" },
        autoResolved: { value: "841", trend: "No Analyst", type: "blue", label: "Auto-Resolved" },
        queue: { value: "0", trend: "Clean", type: "blue", label: "Workflow Queue" },
        health: { value: "100%", trend: "Nominal", type: "orange", label: "Automation Health" }
    },
    reporting: {
        generated: { value: "142", trend: "Total", type: "blue", label: "Generated Reports" },
        scheduled: { value: "28", trend: "Active", type: "blue", label: "Scheduled Reports" },
        exports: { value: "12", trend: "Today", type: "purple", label: "Recent Exports" },
        downloads: { value: "89", trend: "This Week", type: "blue", label: "Report Downloads" }
    },
    customer: {
        total: { value: "42", trend: "Enterprises", type: "blue", label: "Total Customers" },
        tenants: { value: "42/42", trend: "Active", type: "blue", label: "Active Tenants" },
        health: { value: "98.4%", trend: "Nominal", type: "blue", label: "Service Health" },
        sla: { value: "99.95%", trend: "Compliant", type: "purple", label: "SLA Compliance" },
        risk: { value: "Lowward", trend: "Average 24", type: "blue", label: "Customer Risk Scores" },
        incidents: { value: "5", trend: "Across 3 Tenants", type: "orange", label: "Open Customer Incidents" }
    },
    novrai: {
        forecast: { value: "Decreasing", trend: "-14%", type: "purple", label: "AI Risk Forecast" },
        predicted: { value: "2", trend: "Monitored", type: "orange", label: "Predicted Threats" },
        recommendations: { value: "8 Actionable", trend: "Review", type: "blue", label: "AI Recommendations" },
        confidence: { value: "94.8%", trend: "High Conf", type: "purple", label: "Model Confidence" }
    }
};

// 3. TABLE DATA ARRAYS
export const generalActivityLog = [
    { time: "18:04:12", event: "Brute force mitigation triggered on Auth0", severity: "High", source: "Wazuh-Agent", status: "Mitigated" },
    { time: "17:52:40", event: "Unusual outbound data transfer volume", severity: "Medium", source: "Network-Gateway", status: "Investigating" },
    { time: "17:11:05", event: "Malicious macro execution blocked", severity: "Critical", source: "EDR-Agent-04", status: "Isolated" },
    { time: "16:45:22", event: "New domain asset identified via continuous scanning", severity: "Low", source: "Exposure-Monitor", status: "Archived" }
];

export const executiveSummaryData = [
    { unit: "Core Financial Operations", risk: "Low (14/100)", incidents: "0 Active", compliance: "98.2%", trend: "Improving" },
    { unit: "Supply Chain & Logistics Portal", risk: "Medium (42/100)", incidents: "2 Active", compliance: "89.5%", trend: "Stable" },
    { unit: "Customer-Facing Cloud Apps", risk: "Low (22/100)", incidents: "1 Active", compliance: "94.0%", trend: "Improving" }
];

export const operationsQueueData = [
    { incident: "INC-882: Exploit attempt against public web server", analyst: "Mubarak A.", priority: "Critical", status: "Triaging", sla: "11 mins" },
    { incident: "INC-881: Suspicious lateral movement detection", analyst: "Brain O.", priority: "High", status: "Investigating", sla: "34 mins" },
    { incident: "INC-879: Mass file modification alert on cloud share", analyst: "Unassigned", priority: "Medium", status: "Queued", sla: "1h 12m" }
];

export const analystQueueData = [
    { alert: "Mimikatz LSASS Dump Signature Detected", severity: "Critical", source: "EDR_Win_Srv", time: "18:01:05", action: "Isolate Endpoint" },
    { alert: "Multiple Failed SSH Logins Followed by Success", severity: "High", source: "Wazuh_Linux_Prod", time: "17:58:12", action: "Revoke Session" },
    { alert: "Internal Phishing Link Clicked", severity: "Medium", source: "Email_Sec_Gateway", time: "17:44:30", action: "Reset Credentials" }
];

export const complianceFrameworkData = [
    { standard: "NDPA (Nigeria Data Protection Act)", score: "94%", status: "Compliant", auditDate: "2026-05-12" },
    { standard: "CBN Cyber Security Guidelines", score: "89%", status: "Investigating", auditDate: "2026-06-01" },
    { standard: "NCC Risk Management Framework", score: "91%", status: "Compliant", auditDate: "2026-04-20" },
    { standard: "ISO/IEC 27001:2022", score: "92%", status: "Compliant", auditDate: "2026-02-15" }
];

export const msspTenantData = [
    { company: "Sterling Vertex Bank", infrastructure: "Hybrid Cloud / On-Prem", criticals: "0", health: "98/100", status: "Nominal" },
    { company: "Wari Energy Group", infrastructure: "AWS Multicloud", criticals: "2", health: "74/100", status: "Triaging" },
    { company: "Alt-Payment Gateways Ltd", infrastructure: "Azure Native Infrastructure", criticals: "1", health: "88/100", status: "Investigating" }
];
