'use client';

import { createClient } from '../../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useEffect, useState } from 'react';
import { authLogger } from '@/utils/logger';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if this is a password reset request
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type !== 'recovery') {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user }, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        authLogger.logAuthFailure('password_update_failure', user?.email, { error: error.message });
        setError(error.message);
      } else if (user) {
        authLogger.logAuthSuccess('password_updated', user.id, { email: user.email });
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold">Reset Your Password</h1>
        {error && <div className="text-red-500">{error}</div>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New Password"
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Update Password
        </button>
      </form>
    </div>
  );
}