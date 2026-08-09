'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { apiUrl } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';

function passwordStrength(password: string): { score: number; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const color = score >= 3 ? 'bg-green' : score === 2 ? 'bg-amber' : 'bg-grey-500';
    return { score, color };
}

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const strength = useMemo(() => passwordStrength(password), [password]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(apiUrl('/api/auth/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, company, password }),
            });
            const data = await res.json();
            if (!res.ok || !data.token) {
                setError(data?.error ?? 'Sign-up is not available yet. Please contact sales.');
                return;
            }
            localStorage.setItem('admin_token', data.token);
            router.push('/dashboard');
        } catch {
            setError('Sign-up is not available yet. Please contact sales.');
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
            router.push('/dashboard');
        } catch {
            setError('Google sign-in failed. Please try again.');
        }
    };

    return (
        <AuthShell>
            <div className="text-center mb-8">
                <h2 className="font-heading font-bold text-2xl text-foreground">Create your account</h2>
                <p className="text-sm text-foreground-muted mt-1">Start protecting your organization today</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <AuthField label="Full Name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                <AuthField label="Work Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <AuthField label="Company Name" type="text" required value={company} onChange={(e) => setCompany(e.target.value)} />

                <div>
                    <AuthField
                        label="Password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-grey-100'}`}
                            />
                        ))}
                    </div>
                </div>

                <AuthField
                    label="Confirm Password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={confirmPassword.length > 0 && confirmPassword !== password}
                />

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-red hover:bg-red-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {submitting ? 'Creating Account…' : 'Create Account'}
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

            <p className="text-center text-xs text-foreground-muted mt-6">
                By signing up you agree to our Terms of Service and Privacy Policy
            </p>
            <p className="text-center text-xs text-foreground-muted mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-blue font-semibold hover:underline">Sign in</Link>
            </p>
        </AuthShell>
    );
}
