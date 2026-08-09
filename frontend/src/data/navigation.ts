export interface NavigationGroup {
    group: string;
    items: string[];
}

export const navigationStructure: NavigationGroup[] = [
    { group: "Threat Intelligence", items: ["Threat Feeds", "IOC Matcher", "Vulnerability Intel"] },
    { group: "Security Operations", items: ["Live Alerts Feed", "Incident Response", "SOAR Logs"] },
    { group: "Assets & Risk", items: ["Cloud Posture", "Endpoint Inventory", "Network Mapping"] },
    { group: "Compliance", items: ["ISO 27001", "NDPR Framework", "PCI-DSS Logs"] },
    { group: "Exposure Monitoring", items: ["Attack Surface", "Domain Threat Radar"] },
    { group: "Automation", items: ["SOAR Playbooks", "Active Integrations"] }
];