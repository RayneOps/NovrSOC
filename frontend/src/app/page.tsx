'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ShieldCheck, Radar, Server, Mail, Activity, RefreshCw, ArrowRight,
} from 'lucide-react';

const DOMAINS = [
    { icon: ShieldCheck, name: 'Brand Protection', description: 'Monitor domains, spot lookalikes, and shut down impersonation before it reaches your customers.' },
    { icon: Radar, name: 'Threat Intelligence', description: 'Real-time IOC feeds, actor tracking, and campaign correlation tuned for African threat activity.' },
    { icon: Server, name: 'Infrastructure & Network', description: 'Wazuh-powered endpoint and network visibility across every agent, asset, and connection.' },
    { icon: Mail, name: 'Email Security', description: 'Catch phishing, spoofing, and malicious attachments before they land in an inbox.' },
    { icon: Activity, name: 'SecOps & Response', description: 'Unified alert triage, case management, and MITRE-mapped incident response.' },
    { icon: RefreshCw, name: 'Data Continuity', description: 'Backup verification, recovery testing, and continuity reporting built into the platform.' },
];

const STEPS = [
    { title: 'Deploy Sensors', description: 'Install lightweight Wazuh agents and network collectors across your infrastructure.' },
    { title: 'Monitor in Real Time', description: 'NovrAI correlates threats across all 22 feature modules continuously.' },
    { title: 'Respond Instantly', description: 'Automated playbooks isolate threats and notify your team in seconds.' },
];

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="min-h-screen bg-grey-900 text-white font-sans antialiased">
            {/* Navbar */}
            <header
                className={`sticky top-0 z-50 transition-colors ${
                    scrolled ? 'bg-grey-900/90 backdrop-blur border-b border-white/10' : 'bg-transparent border-b border-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/novrsoc.jpg" alt="NovrSOC" className="h-8 w-auto object-contain" />
                        <span className="font-heading font-bold text-lg">NovrSOC</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8 text-sm text-grey-500">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                        <a href="#trusted-by" className="hover:text-white transition-colors">About</a>
                        <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                    </nav>
                    <Link
                        href="/signup"
                        className="bg-red hover:bg-red-hover text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
                    >
                        Request Demo
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
                <h1 className="font-heading font-bold text-4xl md:text-5xl leading-tight">
                    Africa&rsquo;s First AI-Powered Security Operations Platform
                </h1>
                <p className="mt-6 text-lg md:text-xl text-grey-500 max-w-2xl mx-auto">
                    Real-time threat detection, brand protection, and automated incident response — built for African enterprises.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/signup"
                        className="bg-red hover:bg-red-hover text-white font-semibold rounded-lg px-6 py-3 transition-colors"
                    >
                        Request a Demo
                    </Link>
                    <a
                        href="#how-it-works"
                        className="border border-blue text-blue hover:bg-blue/10 rounded-lg px-6 py-3 font-semibold transition-colors"
                    >
                        See How It Works
                    </a>
                </div>
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
                    {[
                        { value: '22', label: 'Security Features' },
                        { value: '6', label: 'Protection Domains' },
                        { value: 'Real-Time', label: 'AI Detection' },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <div className="font-heading font-bold text-3xl text-red">{stat.value}</div>
                            <div className="text-sm text-grey-500 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feature Domains */}
            <section id="features" className="bg-white text-grey-800 py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <h2 className="font-heading font-bold text-3xl text-center">Everything your SOC needs</h2>
                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DOMAINS.map((domain) => {
                            const Icon = domain.icon;
                            return (
                                <div
                                    key={domain.name}
                                    className="group bg-grey-900 rounded-xl p-6 border border-white/10 hover:border-purple/40 transition-colors"
                                >
                                    <Icon className="text-purple" size={28} strokeWidth={1.75} />
                                    <h3 className="font-heading font-bold text-white text-lg mt-4">{domain.name}</h3>
                                    <p className="text-grey-500 text-sm mt-2 leading-relaxed">{domain.description}</p>
                                    <div className="mt-4 flex items-center gap-1 text-sm text-grey-500 group-hover:text-purple transition-colors">
                                        Learn more <ArrowRight size={14} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="font-heading font-bold text-3xl text-center">How It Works</h2>
                    <div className="mt-14 relative grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="hidden md:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-blue/40" aria-hidden />
                        {STEPS.map((step, i) => (
                            <div key={step.title} className="relative text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-grey-900 border-2 border-blue text-blue font-heading font-bold text-lg flex items-center justify-center relative z-10">
                                    {i + 1}
                                </div>
                                <h3 className="font-heading font-bold text-lg mt-5">{step.title}</h3>
                                <p className="text-grey-500 text-sm mt-2 leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section id="trusted-by" className="bg-grey-100 text-grey-800 py-16">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <h2 className="font-heading font-bold text-2xl">Trusted by security teams across Africa</h2>
                    <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                        {/* TODO: replace with real client logos */}
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-lg bg-white border border-grey-100" />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Strip */}
            <section className="bg-grey-900 py-20 text-center">
                <div className="max-w-2xl mx-auto px-6">
                    <h2 className="font-heading font-bold text-3xl">Ready to secure your organization?</h2>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className="bg-red hover:bg-red-hover text-white font-semibold rounded-lg px-6 py-3 transition-colors"
                        >
                            Request a Demo
                        </Link>
                        <Link
                            href="/signup"
                            className="border border-blue text-blue hover:bg-blue/10 rounded-lg px-6 py-3 font-semibold transition-colors"
                        >
                            Start Free Trial
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-grey-900 border-t border-white/10 py-10">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/novrsoc.jpg" alt="NovrSOC" className="h-6 w-auto object-contain" />
                        <span className="font-heading font-bold">NovrSOC</span>
                    </div>
                    <nav className="flex items-center gap-6 text-sm text-grey-500">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#trusted-by" className="hover:text-white transition-colors">About</a>
                        <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                    </nav>
                </div>
                <p className="text-center text-xs text-grey-500 mt-8">© 2026 Cybernovr. All rights reserved.</p>
            </footer>
        </div>
    );
}
