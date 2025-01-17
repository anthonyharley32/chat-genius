'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { authLogger } from '@/utils/logger';
import { rateLimiter } from '@/utils/rateLimiter';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Check rate limit for this email
    const rateLimit = rateLimiter.checkRateLimit(email);
    if (rateLimit.blocked) {
      const minutesLeft = Math.ceil(rateLimit.msBeforeNext / 60000);
      setError(`Too many login attempts. Please try again in ${minutesLeft} minutes.`);
      setLoading(false);
      return;
    }

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        authLogger.logAuthFailure('login_failure', email, { error: error.message });
        throw error;
      }

      if (user) {
        // Reset rate limit on successful login
        rateLimiter.resetLimit(email);
        authLogger.logAuthSuccess('login_success', user.id, { email: user.email });
        
        // Check for suspicious activity
        if (authLogger.checkForSuspiciousActivity(user.id)) {
          authLogger.logAuthWarning('suspicious_login_activity', user.id, {
            email: user.email,
            message: 'Multiple recent login failures detected'
          });
        }
        
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setError('Invalid login credentials');
      if (rateLimit.remainingAttempts > 0) {
        setError(`Invalid login credentials. ${rateLimit.remainingAttempts} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    // Check rate limit for password reset attempts
    const rateLimit = rateLimiter.checkRateLimit(`reset_${email}`);
    if (rateLimit.blocked) {
      const minutesLeft = Math.ceil(rateLimit.msBeforeNext / 60000);
      setError(`Too many password reset attempts. Please try again in ${minutesLeft} minutes.`);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
      });

      if (error) {
        authLogger.logAuthFailure('password_reset_failure', email, { error: error.message });
        throw error;
      }

      authLogger.logAuthSuccess('password_reset_requested', email);
      setMessage('Check your email for the password reset link');
      // Reset rate limit on successful request
      rateLimiter.resetLimit(`reset_${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      if (rateLimit.remainingAttempts > 0) {
        setError(`Failed to send reset link. ${rateLimit.remainingAttempts} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <Logo className="w-16 h-16" />
        <h1 className="mt-4 text-4xl font-bold text-blue-600">ChatGenius</h1>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold">
            Sign in to your account
          </h2>
        </div>
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-md border p-2"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-md border p-2"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-blue-300"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>

        <div className="text-center">
          <button
            onClick={() => document.getElementById('reset-form')?.classList.toggle('hidden')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot your password?
          </button>
        </div>

        <form id="reset-form" onSubmit={handleResetPassword} className="mt-8 space-y-6 hidden">
          <div>
            <h3 className="text-lg font-medium">Reset Password</h3>
            <p className="text-sm text-gray-500">
              Enter your email and we'll send you a reset link
            </p>
          </div>
          
          {message && (
            <div className="bg-green-50 text-green-500 p-3 rounded-md">
              {message}
            </div>
          )}
          
          <div>
            <label htmlFor="reset-email" className="sr-only">
              Email address
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              required
              className="relative block w-full rounded-md border p-2"
              placeholder="Email address"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
