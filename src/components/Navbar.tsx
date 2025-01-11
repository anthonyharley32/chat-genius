'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUserStore } from '@/store/userStore';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

export function Navbar() {
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const avatar = useUserStore((state) => state.avatar);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const resetAvatar = useUserStore((state) => state.resetAvatar);
  const getAvatarUrl = useAvatarUrl();

  useEffect(() => {
    async function loadUserAvatar() {
      setIsLoading(true);
      
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
              const avatarUrl = getAvatarUrl(data.avatar_url);
              console.log('Generated Avatar URL:', avatarUrl);
              setAvatar(avatarUrl || '/defpropic.jpg');
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
  }, [setAvatar, resetAvatar, getAvatarUrl]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/chat');
  };

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 p-2 bg-gray-100 shadow-sm z-10">
      <div className="flex items-center justify-between ml-[20px] mr-[20px]">
        <a href="#" onClick={handleLogoClick} className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-2xl font-bold text-blue-600">ChatGenius</span>
        </a>

        <div className="flex items-center gap-4">
          <Link 
            href="/profile"
            className="hover:opacity-80 transition-opacity"
          >
            {!isLoading && (
              <div className="w-10 h-10">
                <Image
                  src={avatar}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="rounded-full object-cover aspect-square"
                />
              </div>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
} 