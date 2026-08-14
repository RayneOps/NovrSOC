'use client';

import { useState } from 'react';
import { MessageCircle, X, ChevronRight } from 'lucide-react';

const QUICK_QUESTIONS = [
    'How do I add a new endpoint?',
    'How do I configure DMARC monitoring?',
    'What does the Risk Score mean?',
    'How do I respond to an incident?',
    'How do I invite a team member?',
];

export function HelpAssistant() {
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {open && (
                <div className="mb-3 w-[320px] bg-white border border-grey-100 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue px-4 py-3 flex items-center justify-between">
                        <div>
                            <div className="text-white font-semibold text-sm">NovrAI Assistant</div>
                            <div className="text-white/60 text-xs">Ask me anything about this page</div>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Close">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-4">
                        <p className="text-xs text-grey-500 mb-3 font-medium uppercase tracking-wide">Quick Help</p>
                        <div className="space-y-2">
                            {QUICK_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    className="w-full text-left text-xs text-grey-800 hover:text-blue flex items-center justify-between py-2 px-3 rounded-lg hover:bg-blue/5 transition-colors border border-grey-100"
                                >
                                    {q}
                                    <ChevronRight size={12} className="text-grey-500 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ask a question..."
                                className="flex-1 text-xs border border-grey-100 rounded-lg px-3 py-2 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20 text-grey-800 placeholder:text-grey-500"
                            />
                            <button className="bg-blue text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-blue transition-colors">
                                Ask
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen(!open)}
                className="w-12 h-12 bg-blue text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Help assistant"
            >
                {open ? <X size={20} /> : <MessageCircle size={20} />}
            </button>
        </div>
    );
}
