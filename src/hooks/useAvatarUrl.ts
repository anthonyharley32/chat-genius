import { useCallback, useMemo, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useAvatarUrl() {
  const supabase = createClient();
  const avatarUrlCache = useMemo(() => new Map<string, string>(), []);

  // Clear cache when user changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      avatarUrlCache.clear();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, avatarUrlCache]);

  const getAvatarUrl = useCallback((path: string) => {
    // Check cache first
    if (avatarUrlCache.has(path)) {
      return avatarUrlCache.get(path);
    }

    // If no path is provided or it's null/undefined, cache and return default picture
    if (!path) {
      avatarUrlCache.set(path, '/defpropic.jpg');
      return '/defpropic.jpg';
    }

    // If it's already a full URL, cache and return it
    if (path.startsWith('http')) {
      avatarUrlCache.set(path, path);
      return path;
    }

    // If it's just the default picture name, return the local path
    if (path === 'defpropic.jpg' || path === '/defpropic.jpg') {
      avatarUrlCache.set(path, '/defpropic.jpg');
      return '/defpropic.jpg';
    }
    
    // Get the public URL from Supabase storage
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const url = data?.publicUrl || '/defpropic.jpg';
    avatarUrlCache.set(path, url);
    return url;
  }, [supabase, avatarUrlCache]);

  return getAvatarUrl;
} 