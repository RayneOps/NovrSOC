'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { setPortalSession } from '@/lib/portal-auth';
import { apiUrl } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';

export default function PortalLoginPage() {
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
            router.push('/dashboard');
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
            router.push('/dashboard');
        } catch {
            setError('Google sign-in failed. Please try again.');
        }
    };

    return (
        <AuthShell>
            <div className="text-center mb-8">
                <h2 className="font-heading font-bold text-2xl text-foreground">NovrSOC Security Portal</h2>
                <p className="text-sm text-foreground-muted mt-1">Sign in to your client workspace</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <AuthField
                    label="Email"
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

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {submitting ? 'Signing In…' : 'Sign In to Portal'}
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

            <p className="text-center text-[10px] text-foreground-muted mt-10">
                Cybernovr team? Sign in at{' '}
                <Link href="/login" className="text-blue font-semibold hover:underline">/login</Link>
            </p>
            <p className="text-center text-[10px] text-foreground-muted mt-4">Powered by Cybernovr</p>
        </AuthShell>
    );
}
