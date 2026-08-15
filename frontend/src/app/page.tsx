'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ShieldCheck, Radar, Server, Mail, Activity, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { apiUrl } from '@/lib/api';

const DOMAINS = [
    {
        icon: ShieldCheck,
        name: 'Brand Protection',
        color: 'blue',
        description: "Monitor domain lookalikes, social impersonation, rogue mobile apps, and leaked source code across the internet.",
        features: ['Domain Suite', 'Social Suite', 'Executive Monitoring', 'Mobile App Suite'],
    },
    {
        icon: Radar,
        name: 'Threat Intelligence',
        color: 'red',
        description: 'Real-time IOC enrichment, CVE advisories mapped to your actual assets, URL detonation sandbox, and vendor risk scoring.',
        features: ['CTI Platform', 'Threat Advisory', 'URL Scan Suite', 'Website Scanning'],
    },
    {
        icon: Server,
        name: 'Infrastructure',
        color: 'purple',
        description: 'Complete asset inventory, DNS health monitoring, and WebLogic appliance management across cloud and on-premise.',
        features: ['Digital Assets', 'DNS Suite', 'WebLogic Appliances'],
    },
    {
        icon: Mail,
        name: 'Email Security',
        color: 'blue',
        description: 'DMARC enforcement, email relay monitoring, and real-time browser-level phishing protection for your team.',
        features: ['DMARC SaaS', 'Messaging Suite', 'Intelli CODE PHISHID'],
    },
    {
        icon: Activity,
        name: 'SecOps & Response',
        color: 'red',
        description: 'Unified alert console, automated incident response playbooks, and multi-channel escalation to your on-call team.',
        features: ['Threat Management', 'Incident Response', 'Alert Communication'],
    },
    {
        icon: RefreshCw,
        name: 'Data Continuity',
        color: 'purple',
        description: 'Backup integrity monitoring, cryptographic hash verification, and SLA credit calculation for your clients.',
        features: ['Data Loss Recovery', 'Recovery Credit (SLA)'],
    },
];

const DOMAIN_STYLE: Record<string, { icon: string; pill: string }> = {
    blue: { icon: 'bg-blue/10 text-blue', pill: 'bg-blue/10 text-blue' },
    red: { icon: 'bg-red/10 text-red-500', pill: 'bg-red/10 text-red-500' },
    purple: { icon: 'bg-purple/10 text-purple', pill: 'bg-purple/10 text-purple' },
};

const STEPS = [
    { step: '01', color: 'bg-blue', title: 'Deploy Sensors', description: 'Install lightweight Wazuh agents on your endpoints and configure network sensors. Takes under 30 minutes for a full deployment.' },
    { step: '02', color: 'bg-purple', title: 'Monitor in Real Time', description: 'NovrAI correlates threats across all 22 feature modules continuously — brand threats, network anomalies, CVE matches, and more.' },
    { step: '03', color: 'bg-red', title: 'Respond Instantly', description: 'Automated playbooks isolate threats, block malicious IPs at the firewall, and notify your team via Slack, SMS, or PagerDuty in seconds.' },
];

const KPI_CARDS = [
    { label: 'Total Assets', value: '247', accent: '#2B3BCC' },
    { label: 'Active Incidents', value: '12', accent: '#CC2B2B' },
    { label: 'Critical Alerts', value: '3', accent: '#CC2B2B' },
    { label: 'Risk Score', value: '91/100', accent: '#6B1FA8' },
];

function ContactForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) return;
        setStatus('sending');
        try {
            const res = await fetch(apiUrl('/api/contact'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, company, message }),
            });
            if (!res.ok) throw new Error('Request failed');
            setStatus('sent');
        } catch {
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <div className="max-w-lg mx-auto text-center bg-grey-50 border border-grey-100 rounded-2xl p-10">
                <CheckCircle2 size={36} className="text-blue mx-auto mb-4" />
                <h3 className="font-heading font-bold text-xl text-grey-800 mb-2">Request received</h3>
                <p className="text-sm text-grey-500">Thanks, {name.split(' ')[0]}. A member of our team will reach out to {email} shortly.</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="max-w-lg mx-auto bg-grey-50 border border-grey-100 rounded-2xl p-8 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="text-xs font-medium text-grey-500 uppercase tracking-wide">Name</label>
                    <input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                        className="w-full mt-1 bg-white border border-grey-100 rounded-lg px-3 py-2.5 text-sm text-grey-800 placeholder:text-grey-500 focus:outline-none focus:border-blue"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-grey-500 uppercase tracking-wide">Work Email</label>
                    <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com"
                        className="w-full mt-1 bg-white border border-grey-100 rounded-lg px-3 py-2.5 text-sm text-grey-800 placeholder:text-grey-500 focus:outline-none focus:border-blue"
                    />
                </div>
            </div>
            <div className="mb-4">
                <label className="text-xs font-medium text-grey-500 uppercase tracking-wide">Company</label>
                <input
                    type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Ltd (optional)"
                    className="w-full mt-1 bg-white border border-grey-100 rounded-lg px-3 py-2.5 text-sm text-grey-800 placeholder:text-grey-500 focus:outline-none focus:border-blue"
                />
            </div>
            <div className="mb-6">
                <label className="text-xs font-medium text-grey-500 uppercase tracking-wide">What would you like to see?</label>
                <textarea
                    required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your security stack and what you'd like the demo to cover."
                    className="w-full mt-1 bg-white border border-grey-100 rounded-lg px-3 py-2.5 text-sm text-grey-800 placeholder:text-grey-500 focus:outline-none focus:border-blue resize-none"
                />
            </div>
            {status === 'error' && <p className="text-xs text-red-500 mb-4">Something went wrong sending your request — please try again.</p>}
            <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-red hover:bg-red-hover disabled:opacity-60 text-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors"
            >
                {status === 'sending' ? 'Sending…' : 'Request a Demo'}
            </button>
        </form>
    );
}

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white text-grey-800 font-sans antialiased">
            {/* Navbar */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow ${scrolled ? 'border-b border-grey-100 shadow-sm' : 'border-b border-transparent'}`}
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/novrsoc.jpg" alt="NovrSOC" width={98} height={36} className="h-9 w-auto object-contain" priority />
                    </Link>
                    <nav className="hidden md:flex items-center gap-8 text-sm text-grey-500">
                        <a href="#features" className="hover:text-grey-800 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-grey-800 transition-colors">How It Works</a>
                        <a href="#nigeria" className="hover:text-grey-800 transition-colors">About</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm text-grey-500 hover:text-grey-800 transition-colors">Sign In</Link>
                        <a
                            href="#contact"
                            className="bg-red hover:bg-red-hover text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                        >
                            Request Demo
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-40 pb-20 px-6 bg-white">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue/10 text-blue text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" />
                        Now live — AI-powered SOC for African enterprises
                    </div>
                    <h1 className="font-heading font-bold text-4xl md:text-[56px] leading-[1.1] text-grey-800 mb-6">
                        Africa&rsquo;s First <span className="text-blue">AI-Powered</span> Security Operations Platform
                    </h1>
                    <p className="text-lg md:text-xl text-grey-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Real-time threat detection, brand protection, and automated incident response — built specifically for Nigerian and African enterprises.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <a
                            href="#contact"
                            className="bg-red hover:bg-red-hover text-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors"
                        >
                            Request a Demo
                        </a>
                        <a
                            href="#how-it-works"
                            className="border border-blue text-blue hover:bg-blue/10 rounded-lg px-6 py-3 font-semibold text-sm transition-colors"
                        >
                            See How It Works
                        </a>
                    </div>
                    <div className="flex items-center justify-center gap-12">
                        {[
                            { number: '22+', label: 'Security Features' },
                            { number: '6+', label: 'Protection Domains' },
                            { number: 'AI', label: 'Real-Time Detection' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="font-heading font-bold text-4xl text-red-500 mb-1">{stat.number}</div>
                                <div className="text-sm text-grey-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dashboard Preview */}
            <section className="py-12 px-6 bg-grey-50">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white border border-grey-100 rounded-2xl shadow-xl overflow-hidden">
                        {/* Mock browser chrome */}
                        <div className="bg-grey-50 border-b border-grey-100 px-4 py-3 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-amber" />
                                <div className="w-3 h-3 rounded-full bg-green" />
                            </div>
                            <div className="flex-1 bg-white border border-grey-100 rounded px-3 py-1 text-xs text-grey-500 mx-4">
                                app.novrsoc.com/admin/dashboard
                            </div>
                        </div>

                        {/* Mock dashboard content */}
                        <div className="flex h-80">
                            {/* Mock sidebar */}
                            <div className="hidden md:block w-48 bg-white border-r border-grey-100 p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Image src="/novrsoc.jpg" alt="NovrSOC" width={80} height={30} className="h-6 w-auto object-contain" />
                                </div>
                                {['Dashboard', 'Brand Protection', 'Threat Intel', 'Infrastructure', 'Email Security', 'SecOps'].map((item, i) => (
                                    <div
                                        key={item}
                                        className={`text-xs px-2 py-1.5 rounded mb-1 ${i === 0 ? 'bg-blue/10 text-blue font-medium' : 'text-grey-500'}`}
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>

                            {/* Mock main content */}
                            <div className="flex-1 p-4 bg-grey-50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    {KPI_CARDS.map((card) => (
                                        <div
                                            key={card.label}
                                            className="bg-white rounded-lg p-3 border border-grey-100"
                                            style={{ borderTopColor: card.accent, borderTopWidth: 3 }}
                                        >
                                            <div className="text-[10px] text-grey-500 mb-1">{card.label}</div>
                                            <div className="font-heading font-bold text-lg text-grey-800">{card.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-white rounded-lg border border-grey-100 h-36 flex items-center justify-center">
                                    <span className="text-xs text-grey-500">Nigeria Threat Landscape — Live</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Domains */}
            <section id="features" className="py-20 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="font-heading font-bold text-3xl md:text-4xl text-grey-800 mb-4">Everything your SOC needs</h2>
                        <p className="text-lg text-grey-500 max-w-2xl mx-auto">22 security features across 6 protection domains — all in one platform.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DOMAINS.map((domain) => {
                            const Icon = domain.icon;
                            const style = DOMAIN_STYLE[domain.color];
                            return (
                                <div
                                    key={domain.name}
                                    className="border border-grey-100 rounded-xl p-6 hover:border-blue hover:shadow-sm transition-all group"
                                >
                                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${style.icon}`}>
                                        <Icon size={22} strokeWidth={1.75} />
                                    </div>
                                    <h3 className="font-heading font-bold text-lg text-grey-800 mb-2 group-hover:text-blue transition-colors">
                                        {domain.name}
                                    </h3>
                                    <p className="text-sm text-grey-500 mb-4 leading-relaxed">{domain.description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {domain.features.map((f) => (
                                            <span key={f} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.pill}`}>
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20 px-6 bg-grey-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading font-bold text-3xl md:text-4xl text-grey-800 mb-4">How NovrSOC works</h2>
                        <p className="text-lg text-grey-500">From deployment to real-time protection in three steps.</p>
                    </div>
                    <div className="relative">
                        <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-0.5 bg-blue/20" aria-hidden />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {STEPS.map((s) => (
                                <div key={s.step} className="relative text-center">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 font-heading font-bold text-2xl text-white relative z-10 ${s.color}`}>
                                        {s.step}
                                    </div>
                                    <h3 className="font-heading font-bold text-xl text-grey-800 mb-3">{s.title}</h3>
                                    <p className="text-sm text-grey-500 leading-relaxed">{s.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Nigeria-specific callout */}
            <section id="nigeria" className="py-20 px-6 bg-blue">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                            🇳🇬 Built for Nigeria
                        </div>
                        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">
                            Deep Nigerian threat intelligence — built in
                        </h2>
                        <p className="text-lg text-white/70 mb-8 leading-relaxed">
                            NovrSOC includes a proprietary Nigerian ASN database covering MTN, Airtel, Glo, 9mobile, MainOne, ipNX and more —
                            so you know exactly where threats are coming from across all 36 states and the FCT.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {['All 37 Nigerian States Mapped', '10+ Nigerian ISPs', 'NDPR Compliance Ready', 'Lagos · Abuja · Port Harcourt Coverage'].map((f) => (
                                <span key={f} className="bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                                    ✓ {f}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-80 flex-shrink-0">
                        <div className="bg-white/10 rounded-2xl p-6 text-center">
                            <div className="text-6xl mb-3">🗺️</div>
                            <div className="text-white font-heading font-bold text-lg mb-1">Nigeria Threat Map</div>
                            <div className="text-white/60 text-sm">Real-time attack visualization across all states</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact / Request a Demo */}
            <section id="contact" className="py-20 px-6 bg-white">
                <div className="max-w-2xl mx-auto text-center mb-10">
                    <h2 className="font-heading font-bold text-3xl md:text-4xl text-grey-800 mb-4">Ready to secure your organisation?</h2>
                    <p className="text-lg text-grey-500">Tell us a bit about your team and we&rsquo;ll set up a walkthrough of the platform.</p>
                </div>
                <ContactForm />
                <div className="max-w-2xl mx-auto text-center mt-8">
                    <Link
                        href="/client/login"
                        className="inline-block border border-blue text-blue hover:bg-blue/10 rounded-lg px-8 py-3.5 font-semibold transition-colors"
                    >
                        Already a client? Go to Client Portal
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-grey-800 py-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-8">
                        <div>
                            <div className="inline-block bg-white rounded-lg px-3 py-2 mb-3">
                                <Image src="/novrsoc.jpg" alt="NovrSOC" width={100} height={37} className="h-7 w-auto object-contain" />
                            </div>
                            <p className="text-sm text-white/50 max-w-xs">Africa&rsquo;s AI-powered security operations platform. Built by Cybernovr.</p>
                        </div>
                        <div className="flex flex-wrap gap-x-16 gap-y-8">
                            <div>
                                <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Product</div>
                                {[['Features', '#features'], ['How It Works', '#how-it-works']].map(([label, href]) => (
                                    <a key={label} href={href} className="block text-sm text-white/50 hover:text-white mb-2 transition-colors">{label}</a>
                                ))}
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Company</div>
                                {['About', 'Blog', 'Careers'].map((l) => (
                                    <div key={l} className="text-sm text-white/50 hover:text-white mb-2 cursor-default transition-colors">{l}</div>
                                ))}
                                <a href="#contact" className="block text-sm text-white/50 hover:text-white mb-2 transition-colors">Contact</a>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Legal</div>
                                {['Privacy Policy', 'Terms of Service', 'NDPR Compliance'].map((l) => (
                                    <div key={l} className="text-sm text-white/50 hover:text-white mb-2 cursor-default transition-colors">{l}</div>
                                ))}
                                <Link href="/status" className="block text-sm text-blue hover:text-white mb-2 transition-colors">System Status</Link>
                                <Link href="/login" className="block text-sm text-white/50 hover:text-white transition-colors">Sign In</Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="text-xs text-white/30">© 2026 Cybernovr Ltd. All rights reserved.</div>
                        <div className="text-xs text-white/30">Made in Nigeria 🇳🇬</div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
