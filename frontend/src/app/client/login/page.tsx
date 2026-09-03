'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import type { CredentialResponse } from '@react-oauth/google';
import { setPortalSession } from '@/lib/portal-auth';
import { apiUrl, apiFetch } from '@/lib/api';
import { AuthField } from '@/components/auth/AuthField';
import { NigeriaLoginMap } from '@/components/auth/NigeriaLoginMap';
import { Logo } from '@/components/shared/Logo';

// See frontend/src/app/login/page.tsx for why this is dynamic + ssr:false.
const GoogleLogin = dynamic(
    () => import('@react-oauth/google').then((m) => ({ default: m.GoogleLogin })),
    { ssr: false }
);

export default function ClientLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    // Honeypot — see frontend/src/app/login/page.tsx for why.
    const [gotcha, setGotcha] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await apiFetch(apiUrl('/api/portal/auth/signin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, _gotcha: gotcha }),
            });
            const data = await res.json();
            if (!res.ok || !data.token) {
                setError('Invalid credentials. Contact your security team.');
                return;
            }
            setPortalSession(data.token, data.user);
            router.push('/client/dashboard');
        } catch {
            setError('Invalid credentials. Contact your security team.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        setError(null);
        try {
            const res = await apiFetch(apiUrl('/api/auth/google'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });
            const data = await res.json();
            if (!res.ok || !data.token) {
                setError('Google sign-in failed. Please try again.');
                return;
            }
            setPortalSession(data.token, data.user);
            router.push('/client/dashboard');
        } catch {
            setError('Google sign-in failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel — form */}
            <div className="w-full lg:w-2/5 flex flex-col justify-between bg-white p-10 lg:p-16 min-h-screen">

                {/* Top — logo */}
                <Logo size="md" />

                {/* Middle — form */}
                <div className="w-full max-w-sm mx-auto">
                    <h1 className="font-black text-3xl text-foreground mb-2 tracking-tight">Client Portal</h1>
                    <p className="text-foreground-muted text-sm mb-8">Sign in to your NovrSOC client workspace</p>

                    <form onSubmit={submit} className="space-y-4">
                        <input
                            type="text"
                            name="_gotcha"
                            value={gotcha}
                            onChange={(e) => setGotcha(e.target.value)}
                            className="hidden"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />
                        <AuthField
                            label="Work Email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={Boolean(error)}
                            placeholder="you@yourcompany.com"
                        />
                        <div className="relative">
                            <AuthField
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                error={Boolean(error)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-9 text-foreground-muted hover:text-foreground transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <div className="text-right">
                            <Link href="#" className="text-xs font-semibold text-purple hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-purple hover:bg-purple-hover text-white font-bold py-3.5 rounded-xl transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-foreground-muted text-xs">OR</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="w-full border border-border rounded-xl hover:border-purple/30 hover:bg-[#F5F0FF] transition-all">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google sign-in failed. Please try again.')}
                            useOneTap={false}
                            theme="outline"
                            size="large"
                            width="100%"
                        />
                    </div>
                </div>

                {/* Bottom — footer note */}
                <div className="text-center">
                    <p className="text-foreground-muted text-xs">
                        Analyst? Access admin portal at{' '}
                        <Link href="/login" className="text-purple hover:underline">/login</Link>
                    </p>
                    <p className="text-grey-300 text-xs mt-2">Powered by Cybernovr</p>
                </div>
            </div>

            {/* Right panel — Nigeria map */}
            <NigeriaLoginMap />
        </div>
    );
}
