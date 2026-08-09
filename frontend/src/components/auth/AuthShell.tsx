export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex">
            {/* Left brand panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-grey-900 relative overflow-hidden items-center justify-center">
                <div
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(#2B3BCC 1px, transparent 1px), linear-gradient(90deg, #2B3BCC 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />
                <div className="relative text-center px-12">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/novrsoc.jpg" alt="NovrSOC" className="h-14 w-auto object-contain mx-auto mb-6" />
                    <h1 className="font-heading font-bold text-3xl text-white">NovrSOC</h1>
                    <p className="mt-3 text-grey-500 italic">Secure. Intelligent. Relentless.</p>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center bg-surface px-6 py-12">
                <div className="w-full max-w-[420px]">{children}</div>
            </div>
        </div>
    );
}
