'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import type { CredentialResponse } from '@react-oauth/google';
import { apiUrl } from '@/lib/api';

// Dynamically imported with ssr:false: @react-oauth/google's GoogleLogin throws "Google
// OAuth components must be used within GoogleOAuthProvider" if it ever renders without a
// live provider in context (e.g. NEXT_PUBLIC_GOOGLE_CLIENT_ID missing at build time) — this
// keeps that failure mode from taking down static prerendering of this page. Only the
// button itself is deferred to the client; the rest of the page still prerenders normally.
const GoogleLogin = dynamic(
    () => import('@react-oauth/google').then((m) => ({ default: m.GoogleLogin })),
    { ssr: false }
);
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(apiUrl('/api/auth/signin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok || !data.token) {
                setError('Invalid credentials');
                return;
            }
            localStorage.setItem('admin_token', data.token);
            router.push('/admin/dashboard');
        } catch {
            setError('Invalid credentials');
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
            localStorage.setItem('admin_token', data.token);
            router.push('/admin/dashboard');
        } catch {
            setError('Google sign-in failed. Please try again.');
        }
    };

    return (
        <AuthShell>
            <div className="text-center mb-8">
                <h2 className="font-heading font-bold text-2xl text-foreground">Welcome back</h2>
                <p className="text-sm text-foreground-muted mt-1">Sign in to your NovrSOC workspace</p>
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
                        className="absolute right-3 top-8.5 text-foreground-muted hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                <div className="text-right">
                    <Link href="#" className="text-xs font-semibold text-blue hover:underline">
                        Forgot password?
                    </Link>
                </div>

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-orange hover:bg-orange-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {submitting ? 'Signing In…' : 'Sign In'}
                </button>
            </form>

            <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-foreground-muted">OR</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                useOneTap={false}
                theme="outline"
                size="large"
                width="100%"
            />

            <p className="text-center text-[10px] text-foreground-muted mt-6">
                Client? Access your portal at{' '}
                <Link href="/client/login" className="text-blue font-semibold hover:underline">/client/login</Link>
            </p>
            <p className="text-center text-[10px] text-foreground-muted mt-4">Powered by Cybernovr</p>
        </AuthShell>
    );
}
