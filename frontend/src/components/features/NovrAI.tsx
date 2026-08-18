'use client';

import { useState, useRef, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTED_PROMPTS = [
    'Show me critical incidents in the last 24 hours',
    'What MITRE techniques were detected this week?',
    'Which assets have the highest exposure score?',
    'Summarize our compliance posture',
    'What threat actors are targeting Nigerian banks right now?',
];

const CONTEXT_STATS = [
    { label: 'Active Alerts', value: 14, color: 'text-amber' },
    { label: 'Open Incidents', value: 8, color: 'text-red-500' },
    { label: 'Critical', value: 3, color: 'text-red-500' },
    { label: 'Risk Score', value: '68/100', color: 'text-amber' },
    { label: 'Top MITRE Tactic', value: 'Initial Access', color: 'text-blue' },
];

function parseAssistantMessage(text: string) {
    const lines = text.split('\n');
    return (
        <div className="space-y-2 text-xs text-foreground leading-relaxed">
            {lines.map((line, i) => {
                if (line.startsWith('# ') || line.startsWith('## ')) return <p key={i} className="font-black text-foreground text-sm">{line.replace(/^#+\s/, '')}</p>;
                if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="flex items-start gap-2"><span className="text-blue flex-shrink-0">•</span><span>{line.replace(/^[-•]\s/, '')}</span></p>;
                if (/^\d+\./.test(line)) return <p key={i} className="flex items-start gap-2"><span className="text-blue font-bold flex-shrink-0">{line.match(/^\d+/)?.[0]}.</span><span>{line.replace(/^\d+\.\s/, '')}</span></p>;
                if (line.match(/T\d{4}(\.\d{3})?/)) {
                    const parts = line.split(/(T\d{4}(?:\.\d{3})?)/g);
                    return <p key={i}>{parts.map((p, j) => p.match(/T\d{4}(\.\d{3})?/) ? <span key={j} className="text-amber font-mono font-bold cursor-pointer hover:underline">{p}</span> : p)}</p>;
                }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <p key={i}>{line}</p>;
            })}
        </div>
    );
}

export function NovrAI() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async (text: string) => {
        if (!text.trim() || loading) return;
        setError('');
        const userMsg: Message = { role: 'user', content: text };
        const updated = [...messages, userMsg];
        setMessages(updated);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(apiUrl('/api/novr-ai'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updated.map(m => ({ role: m.role, content: m.content })) }),
            });
            const data = await res.json() as { reply?: string; error?: string };
            if (!res.ok || !data.reply) throw new Error(data.error ?? 'Request failed');
            setMessages([...updated, { role: 'assistant', content: data.reply }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
            <div className="flex gap-5 h-[calc(100vh-160px)]">

                {/* Left context sidebar */}
                <div className="w-48 flex-shrink-0 space-y-4">
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="h-[3px] bg-blue from-blue via-blue to-red-500" />
                        <div className="p-3">
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3">Current Stats</p>
                            <div className="space-y-2">
                                {CONTEXT_STATS.map(s => (
                                    <div key={s.label} className="flex justify-between items-center">
                                        <span className="text-[10px] text-foreground-muted">{s.label}</span>
                                        <span className={`text-[10px] font-black ${s.color}`}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-border">
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                                    </span>
                                    <span className="text-[9px] text-foreground-muted">Live · Just now</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {messages.length > 0 && (
                        <button onClick={() => setMessages([])}
                            className="w-full text-[10px] font-bold text-foreground-muted hover:text-red-500 border border-border rounded-lg py-2 transition-colors">
                            Clear Chat
                        </button>
                    )}
                </div>

                {/* Main chat */}
                <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
                    <div className="h-[3px] bg-blue from-blue via-blue to-red-500" />

                    {/* Chat area */}
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-14 h-14 rounded-2xl bg-blue from-blue to-blue flex items-center justify-center mb-4 shadow-lg">
                                    <span className="text-2xl">🤖</span>
                                </div>
                                <h2 className="text-base font-black text-foreground">NovrAI</h2>
                                <p className="text-xs text-foreground-muted mt-1 mb-6">Your AI-Powered SOC Analyst</p>
                                <div className="flex flex-col gap-2 w-full max-w-md">
                                    {SUGGESTED_PROMPTS.map(p => (
                                        <button key={p} onClick={() => send(p)}
                                            className="text-left text-xs text-foreground bg-card-muted hover:bg-card-muted border border-border hover:border-blue/30 rounded-lg px-4 py-2.5 transition-all">
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 ${m.role === 'user' ? 'bg-grey-100' : 'bg-blue from-blue to-blue'}`}>
                                    {m.role === 'user' ? 'U' : '🤖'}
                                </div>
                                <div className={`max-w-[75%] rounded-xl px-4 py-3 ${m.role === 'user' ? 'bg-blue/10 border border-blue/30 text-foreground' : 'bg-card-muted border border-border'}`}>
                                    {m.role === 'assistant' ? parseAssistantMessage(m.content) : <p className="text-xs text-foreground">{m.content}</p>}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded-lg bg-blue from-blue to-blue flex items-center justify-center text-[11px] flex-shrink-0">🤖</div>
                                <div className="bg-card-muted border border-border rounded-xl px-4 py-3">
                                    <div className="flex gap-1">
                                        {[0, 0.2, 0.4].map((delay, i) => (
                                            <div key={i} className="w-1.5 h-1.5 bg-amber rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</div>}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-border p-3">
                        <div className="flex gap-2 items-end">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(input); }}
                                placeholder="Ask NovrAI about incidents, threats, compliance, or anything security-related…"
                                rows={2}
                                className="flex-1 bg-card-muted border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue/20 resize-none"
                            />
                            <button onClick={() => send(input)} disabled={loading || !input.trim()}
                                className="px-4 py-2.5 bg-orange hover:bg-orange-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors">
                                Send
                            </button>
                        </div>
                        <p className="text-[9px] text-foreground-muted mt-1.5">Press ⌘+Enter to send</p>
                    </div>
                </div>
            </div>
    );
}
