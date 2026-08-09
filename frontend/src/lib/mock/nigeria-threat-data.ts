export const nigeriaThreatData = {
  Lagos: {
    level: "Critical",
    primaryThreat: "Ransomware",
    attacks: 485,
    malware: "LockBit 3.0",
    target: "Financial Services",
    sourceCountries: ["Russia", "Netherlands", "China"],
    iocs: 195,
    mitre: ["T1486", "T1021", "T1059"],
    color: "#EF4444",
    activity: [
      "IOC Added",
      "C2 Beacon",
      "Encryption Attempt",
      "Privilege Escalation"
    ]
  },

  FCT: {
    level: "Critical",
    primaryThreat: "Credential Theft",
    attacks: 395,
    malware: "RedLine Stealer",
    target: "Government & MDAs",
    sourceCountries: ["China", "Iran", "Russia"],
    iocs: 145,
    mitre: ["T1110", "T1078", "T1555"],
    color: "#EF4444",
    activity: [
      "Password Spray",
      "Phishing Campaign",
      "Credential Dump",
      "Token Theft"
    ]
  },

  Rivers: {
    level: "High",
    primaryThreat: "Botnet",
    attacks: 315,
    malware: "Mirai Variant",
    target: "Oil & Gas / Maritime",
    sourceCountries: ["Brazil", "Vietnam", "Russia"],
    iocs: 105,
    mitre: ["T1498", "T1071", "T1133"],
    color: "#D97706",
    activity: [
      "Bot Registration",
      "DDoS Traffic",
      "C2 Beaconing"
    ]
  },

  Kano: {
    level: "High",
    primaryThreat: "Malware",
    attacks: 265,
    malware: "AgentTesla",
    target: "Commerce & Logistics",
    sourceCountries: ["India", "Pakistan", "China"],
    iocs: 85,
    mitre: ["T1204", "T1056", "T1041"],
    color: "#D97706",
    activity: [
      "Malware Download",
      "Keylogging",
      "Exfiltration"
    ]
  },

  Oyo: {
    level: "High",
    primaryThreat: "Phishing",
    attacks: 245,
    malware: "Remcos RAT",
    target: "Higher Education & FinTech",
    sourceCountries: ["Nigeria (Internal)", "Netherlands", "USA"],
    iocs: 75,
    mitre: ["T1566", "T1204", "T1059"],
    color: "#D97706",
    activity: [
      "Smishing Campaign",
      "Credential Harvesting",
      "Session Hijacking"
    ]
  },

  Delta: {
    level: "High",
    primaryThreat: "Ransomware",
    attacks: 225,
    malware: "BlackCat / ALPHV",
    target: "Energy & Infrastructure",
    sourceCountries: ["Russia", "Romania"],
    iocs: 65,
    mitre: ["T1486", "T1490"],
    color: "#D97706",
    activity: [
      "Vulnerability Scan",
      "Shadow Copy Deletion",
      "Ransom Note Dropped"
    ]
  },

  Kaduna: {
    level: "Critical",
    primaryThreat: "APT",
    attacks: 215,
    malware: "PlugX",
    target: "Defense & Public Utilities",
    sourceCountries: ["North Korea", "China"],
    iocs: 115,
    mitre: ["T1055", "T1059", "T1071"],
    color: "#EF4444",
    activity: [
      "DLL Injection",
      "Lateral Movement",
      "C2 Tunneling"
    ]
  },

  Ogun: {
    level: "High",
    primaryThreat: "Credential Theft",
    attacks: 195,
    malware: "Racoon Stealer",
    target: "Manufacturing & Supply Chain",
    sourceCountries: ["Germany", "Russia"],
    iocs: 55,
    mitre: ["T1555", "T1539"],
    color: "#D97706",
    activity: [
      "Browser Cache Steal",
      "Session Token Exfiltration"
    ]
  },

  Edo: {
    level: "Medium",
    primaryThreat: "Phishing",
    attacks: 175,
    malware: "Formbook",
    target: "Agro-Tech & Retail",
    sourceCountries: ["USA", "Internal"],
    iocs: 45,
    mitre: ["T1566", "T1056"],
    color: "#f59e0b",
    activity: [
      "Spear Phishing Email",
      "Malicious Attachment"
    ]
  },

  AkwaIbom: {
    level: "Medium",
    primaryThreat: "DDoS",
    attacks: 165,
    malware: "XorDDoS",
    target: "Public Sector & Maritime",
    sourceCountries: ["China", "Vietnam"],
    iocs: 45,
    mitre: ["T1498", "T1499"],
    color: "#f59e0b",
    activity: [
      "SYN Flood",
      "UDP Reflection",
      "Service Outage"
    ]
  },

  Enugu: {
    level: "Medium",
    primaryThreat: "Malware",
    attacks: 155,
    malware: "AsyncRAT",
    target: "Healthcare & Education",
    sourceCountries: ["Internal", "Brazil"],
    iocs: 35,
    mitre: ["T1021", "T1059"],
    color: "#f59e0b",
    activity: [
      "Remote Access Injection",
      "Screen Capture"
    ]
  },

  Anambra: {
    level: "Medium",
    primaryThreat: "Phishing",
    attacks: 145,
    malware: "NjRAT",
    target: "Commercial Markets & Banking",
    sourceCountries: ["India", "Internal"],
    iocs: 35,
    mitre: ["T1566", "T1078"],
    color: "#f59e0b",
    activity: [
      "Fake Bank Portal",
      "SMS Smishing"
    ]
  },

  Plateau: {
    level: "Medium",
    primaryThreat: "APT",
    attacks: 135,
    malware: "ShadowPad",
    target: "Mining & Research",
    sourceCountries: ["China"],
    iocs: 45,
    mitre: ["T1071", "T1041"],
    color: "#f59e0b",
    activity: [
      "Data Staging",
      "Encrypted Exfiltration"
    ]
  },

  Ondo: {
    level: "Medium",
    primaryThreat: "Credential Theft",
    attacks: 125,
    malware: "Pony Stealer",
    target: "State Government",
    sourceCountries: ["Russia", "Ukraine"],
    iocs: 35,
    mitre: ["T1110", "T1552"],
    color: "#f59e0b",
    activity: [
      "Brute Force Attempt",
      "Config Dump"
    ]
  },

  Imo: {
    level: "Medium",
    primaryThreat: "Botnet",
    attacks: 115,
    malware: "Gafgyt",
    target: "Telecom Sub-stations",
    sourceCountries: ["USA", "Brazil"],
    iocs: 25,
    mitre: ["T1498"],
    color: "#f59e0b",
    activity: [
      "Router Exploit",
      "Telnet Brute Force"
    ]
  },

  Kwara: {
    level: "Medium",
    primaryThreat: "Malware",
    attacks: 105,
    malware: "Nanocore",
    target: "Universities & Agro",
    sourceCountries: ["Germany", "Internal"],
    iocs: 25,
    mitre: ["T1204", "T1056"],
    color: "#f59e0b",
    activity: [
      "Keylogger Execution",
      "Webcam Access"
    ]
  },

  CrossRiver: {
    level: "Low",
    primaryThreat: "Phishing",
    attacks: 95,
    malware: "HawkEye",
    target: "Tourism & Forestry",
    sourceCountries: ["Internal"],
    iocs: 25,
    mitre: ["T1566"],
    color: "#D97706",
    activity: [
      "Credential Harvesting",
      "Fake Receipt Spam"
    ]
  },

  Abia: {
    level: "Low",
    primaryThreat: "Credential Theft",
    attacks: 95,
    malware: "Vidar Stealer",
    target: "SME Manufacturers",
    sourceCountries: ["Russia", "Turkey"],
    iocs: 25,
    mitre: ["T1555"],
    color: "#D97706",
    activity: [
      "Crypto Wallet Theft",
      "Browser Stealing"
    ]
  },

  Osun: {
    level: "Low",
    primaryThreat: "Malware",
    attacks: 85,
    malware: "Quasar RAT",
    target: "State Education",
    sourceCountries: ["Internal"],
    iocs: 15,
    mitre: ["T1059"],
    color: "#D97706",
    activity: [
      "PowerShell Script Exec",
      "Persistence Registry Key"
    ]
  },

  Bauchi: {
    level: "Low",
    primaryThreat: "Botnet",
    attacks: 85,
    malware: "Mirai",
    target: "Public Infrastructure",
    sourceCountries: ["Vietnam"],
    iocs: 15,
    mitre: ["T1498"],
    color: "#D97706",
    activity: [
      "IoT Scanner Activity",
      "HTTP Flood"
    ]
  },

  Benue: {
    level: "Low",
    primaryThreat: "Phishing",
    attacks: 75,
    malware: "AgentTesla",
    target: "Agro Cooperatives",
    sourceCountries: ["India", "Internal"],
    iocs: 15,
    mitre: ["T1566"],
    color: "#D97706",
    activity: [
      "Email Impersonation",
      "Malicious PDF Dropper"
    ]
  },

  Nasarawa: {
    level: "Low",
    primaryThreat: "DDoS",
    attacks: 75,
    malware: "DDoS-Bot",
    target: "State Portals",
    sourceCountries: ["China"],
    iocs: 15,
    mitre: ["T1498"],
    color: "#D97706",
    activity: [
      "DNS Amplification",
      "Bandwidth Spike"
    ]
  },

  Katsina: {
    level: "Low",
    primaryThreat: "Malware",
    attacks: 65,
    malware: "Snake Keylogger",
    target: "Local Government",
    sourceCountries: ["Pakistan"],
    iocs: 15,
    mitre: ["T1056"],
    color: "#16A34A",
    activity: [
      "Keystroke Logging",
      "SMTP Exfiltration"
    ]
  },

  Sokoto: {
    level: "Low",
    primaryThreat: "Credential Theft",
    attacks: 65,
    malware: "RedLine",
    target: "Higher Institutions",
    sourceCountries: ["Internal"],
    iocs: 15,
    mitre: ["T1110"],
    color: "#16A34A",
    activity: [
      "Student Portal Spray",
      "Password Theft"
    ]
  },

  Bayelsa: {
    level: "Low",
    primaryThreat: "Ransomware",
    attacks: 65,
    malware: "Dharma / CrySiS",
    target: "Local Energy Contractors",
    sourceCountries: ["Russia"],
    iocs: 15,
    mitre: ["T1486"],
    color: "#16A34A",
    activity: [
      "RDP Brute Force",
      "File Encryption"
    ]
  },

  Niger: {
    level: "Low",
    primaryThreat: "Phishing",
    attacks: 55,
    malware: "Formbook",
    target: "Power Hydro Plants",
    sourceCountries: ["Iran", "Internal"],
    iocs: 15,
    mitre: ["T1566"],
    color: "#16A34A",
    activity: [
      "Spear Phishing",
      "Credential Harvest"
    ]
  },

  Ekiti: {
    level: "Low",
    primaryThreat: "Malware",
    attacks: 55,
    malware: "AsyncRAT",
    target: "Health Services",
    sourceCountries: ["Internal"],
    iocs: 5,
    mitre: ["T1204"],
    color: "#16A34A",
    activity: [
      "Malicious Executable",
      "Task Scheduler Add"
    ]
  },

  Taraba: {
    level: "Low",
    primaryThreat: "Botnet",
    attacks: 45,
    malware: "Mozi Botnet",
    target: "Telecom Routers",
    sourceCountries: ["China"],
    iocs: 5,
    mitre: ["T1071"],
    color: "#16A34A",
    activity: [
      "DHT Protocol Abuse",
      "C2 Handshake"
    ]
  },

  Kebbi: {
    level: "Low",
    primaryThreat: "Phishing",
    attacks: 45,
    malware: "Remcos",
    target: "State Agriculture",
    sourceCountries: ["Internal"],
    iocs: 5,
    mitre: ["T1566"],
    color: "#16A34A",
    activity: [
      "WhatsApp Smishing",
      "Fake Web Form"
    ]
  },

  Adamawa: {
    level: "Low",
    primaryThreat: "Credential Theft",
    attacks: 45,
    malware: "Pony",
    target: "NGOs & Aid Services",
    sourceCountries: ["Turkey"],
    iocs: 5,
    mitre: ["T1552"],
    color: "#16A34A",
    activity: [
      "FTP Credential Harvest",
      "Mail Client Steal"
    ]
  },

  Gombe: {
    level: "Low",
    primaryThreat: "Malware",
    attacks: 35,
    malware: "AgentTesla",
    target: "Transport & Agro",
    sourceCountries: ["Internal"],
    iocs: 5,
    mitre: ["T1056"],
    color: "#16A34A",
    activity: [
      "Screen Capture",
      "Exfiltration over Telegram"
    ]
  },

  Kogi: {
    level: "Low",
    primaryThreat: "DDoS",
    attacks: 35,
    malware: "Mirai",
    target: "Mining Contracts",
    sourceCountries: ["Brazil"],
    iocs: 5,
    mitre: ["T1498"],
    color: "#16A34A",
    activity: [
      "Port Scan",
      "Ping Flood"
    ]
  },

  Jigawa: {
    level: "Low",
    primaryThreat: "Phishing",
    attacks: 35,
    malware: "HawkEye",
    target: "Civil Service Portal",
    sourceCountries: ["Internal"],
    iocs: 5,
    mitre: ["T1566"],
    color: "#16A34A",
    activity: [
      "Fake Login Page",
      "Session Hijack"
    ]
  },

  Zamfara: {
    level: "Low",
    primaryThreat: "Credential Theft",
    attacks: 25,
    malware: "Racoon Stealer",
    target: "Local Finance",
    sourceCountries: ["Russia"],
    iocs: 5,
    mitre: ["T1110"],
    color: "#16A34A",
    activity: [
      "Brute Force Login",
      "Credential Dump"
    ]
  },

  Yobe: {
    level: "Low",
    primaryThreat: "Botnet",
    attacks: 25,
    malware: "Gafgyt",
    target: "Public Networks",
    sourceCountries: ["China"],
    iocs: 5,
    mitre: ["T1071"],
    color: "#16A34A",
    activity: [
      "Telnet Attack",
      "Zombie Node Registration"
    ]
  },

  Borno: {
    level: "Low",
    primaryThreat: "APT",
    attacks: 25,
    malware: "SideCopy",
    target: "Humanitarian & Military Ops",
    sourceCountries: ["South Asia"],
    iocs: 15,
    mitre: ["T1059", "T1071"],
    color: "#16A34A",
    activity: [
      "Spear Phishing Lure",
      "C2 Reconnaissance"
    ]
  },

  Ebonyi: {
    level: "Low",
    primaryThreat: "Phishing",
    attacks: 15,
    malware: "NjRAT",
    target: "Local Agro Trade",
    sourceCountries: ["Internal"],
    iocs: 5,
    mitre: ["T1566"],
    color: "#16A34A",
    activity: [
      "Fake WhatsApp Invoice",
      "Malicious Link"
    ]
  }
};