'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUserStore } from '@/store/userStore';

export function Navbar() {
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const avatar = useUserStore((state) => state.avatar);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const resetAvatar = useUserStore((state) => state.resetAvatar);

  useEffect(() => {
    async function loadUserAvatar() {
      setIsLoading(true);
      resetAvatar();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (data?.avatar_url) {
          try {
            console.log('Raw avatar_url from DB:', data.avatar_url);
            if (data.avatar_url === 'defpropic.jpg' || data.avatar_url === '/defpropic.jpg') {
              setAvatar('/defpropic.jpg');
            } else {
              const avatarUrl = supabase.storage
                .from('avatars')
                .getPublicUrl(data.avatar_url)
                .data.publicUrl;
              console.log('Generated Avatar URL:', avatarUrl);
              setAvatar(avatarUrl);
            }
          } catch (error) {
            console.error('Error getting avatar URL:', error);
            setAvatar('/defpropic.jpg');
          }
        } else {
          console.log('No avatar_url, using default');
          setAvatar('/defpropic.jpg');
        }
      }
      setIsLoading(false);
    }

    loadUserAvatar();
  }, [setAvatar, resetAvatar]);

  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    router.push(user ? '/chat' : '/login');
  };

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 p-2 bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#" onClick={handleLogoClick} className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-2xl font-bold text-blue-600">ChatGenius</span>
        </a>

        <Link 
          href="/profile" 
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          {!isLoading && (
            <Image
              src={avatar}
              alt="Profile"
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
        </Link>
      </div>
    </nav>
  );
} 