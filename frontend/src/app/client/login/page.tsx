'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import type { CredentialResponse } from '@react-oauth/google';
import { setPortalSession } from '@/lib/portal-auth';
import { apiUrl } from '@/lib/api';
import { NovrSOCLogo } from '@/components/shared/NovrSOCLogo';
import { AuthField } from '@/components/auth/AuthField';

// See frontend/src/app/login/page.tsx for why this is dynamic + ssr:false.
const GoogleLogin = dynamic(
    () => import('@react-oauth/google').then((m) => ({ default: m.GoogleLogin })),
    { ssr: false }
);

const FEATURE_PILLS = ['Real-time threat monitoring', 'Brand protection', 'Incident response'];

export default function ClientLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(apiUrl('/api/portal/auth/signin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
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
            const res = await fetch(apiUrl('/api/auth/google'), {
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
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-[40%] bg-blue items-center justify-center px-12">
                <div className="flex flex-col items-center text-center">
                    <NovrSOCLogo variant="white" />
                    <p className="mt-6 text-white/70 italic text-sm">Your security. Monitored. Always.</p>
                    <div className="mt-8 space-y-2.5 text-left inline-block">
                        {FEATURE_PILLS.map((pill) => (
                            <div key={pill} className="text-white/60 text-xs flex items-center gap-2">
                                <span>✦</span>
                                {pill}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-[400px]">
                    <div className="text-center mb-8">
                        <h2 className="font-heading font-bold text-2xl text-grey-800">Client Portal</h2>
                        <p className="text-sm text-grey-500 mt-1">Sign in to your organisation&rsquo;s security dashboard</p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <AuthField
                            label="Work Email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={Boolean(error)}
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
                                className="absolute right-3 top-8.5 text-grey-500 hover:text-grey-800 transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <div className="text-right">
                            <Link href="#" className="text-xs text-blue">Forgot password?</Link>
                        </div>

                        {error && <p className="text-xs text-red text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            {submitting ? 'Signing In…' : 'Sign In'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-grey-100" />
                        <span className="text-xs text-grey-500">OR</span>
                        <div className="flex-1 h-px bg-grey-100" />
                    </div>

                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google sign-in failed. Please try again.')}
                        useOneTap={false}
                        theme="outline"
                        size="large"
                        width="100%"
                    />

                    <p className="text-center text-xs text-grey-500 mt-6">
                        Don&rsquo;t have an account? Contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
