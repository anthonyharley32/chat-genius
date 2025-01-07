'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserStore } from '@/store/userStore';

const TIMEZONES = [
  'Anchorage (AKST) -09:00 UTC',
  'Auckland (NZST) +12:00 UTC',
  'Bangkok (ICT) +07:00 UTC',
  'Beijing (CST) +08:00 UTC',
  'Berlin (CET) +01:00 UTC',
  'Brisbane (AEST) +10:00 UTC',
  'Cairo (EET) +02:00 UTC',
  'Chicago (CST) -06:00 UTC',
  'Denver (MST) -07:00 UTC',
  'Dubai (GST) +04:00 UTC',
  'Dublin (IST) +01:00 UTC',
  'Hong Kong (HKT) +08:00 UTC',
  'Honolulu (HST) -10:00 UTC',
  'Istanbul (TRT) +03:00 UTC',
  'Jakarta (WIB) +07:00 UTC',
  'Jerusalem (IST) +02:00 UTC',
  'Johannesburg (SAST) +02:00 UTC',
  'Karachi (PKT) +05:00 UTC',
  'Kolkata (IST) +05:30 UTC',
  'Kuala Lumpur (MYT) +08:00 UTC',
  'London (GMT) +00:00 UTC',
  'Los Angeles (PST) -08:00 UTC',
  'Madrid (CET) +01:00 UTC',
  'Mexico City (CST) -06:00 UTC',
  'Moscow (MSK) +03:00 UTC',
  'Mumbai (IST) +05:30 UTC',
  'New Delhi (IST) +05:30 UTC',
  'New York (EST) -05:00 UTC',
  'Paris (CET) +01:00 UTC',
  'Rio de Janeiro (BRT) -03:00 UTC',
  'Rome (CET) +01:00 UTC',
  'São Paulo (BRT) -03:00 UTC',
  'Seoul (KST) +09:00 UTC',
  'Shanghai (CST) +08:00 UTC',
  'Singapore (SGT) +08:00 UTC',
  'Sydney (AEST) +10:00 UTC',
  'Taipei (CST) +08:00 UTC',
  'Tokyo (JST) +09:00 UTC',
  'Toronto (EST) -05:00 UTC',
  'Vancouver (PST) -08:00 UTC',
  'Vienna (CET) +01:00 UTC',
  'Wellington (NZST) +12:00 UTC',
  'Zurich (CET) +01:00 UTC'
].sort();

const STATUS_OPTIONS = [
  'online',
  'offline',
  'busy',
  'away'
].sort();

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [timezone, setTimezone] = useState('');
  const avatar = useUserStore((state) => state.avatar);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timezoneRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [showStatusSuggestions, setShowStatusSuggestions] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('online');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function getProfile() {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setUsername(data.username || '');
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setTimezone(data.timezone || '');
        setStatus(data.status || 'online');
        
        if (data.avatar_url) {
          const avatarUrl = supabase.storage
            .from('avatars')
            .getPublicUrl(data.avatar_url)
            .data.publicUrl;
          setAvatar(avatarUrl);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }

  async function updateProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const updates = {
        full_name: fullName,
        username,
        display_name: displayName,
        bio,
        timezone,
        status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/login');
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: filePath })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      const avatarUrl = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
        .data.publicUrl;

      setAvatar(avatarUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  }

  const getAvatarUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return supabase.storage
      .from('avatars')
      .getPublicUrl(path)
      .data.publicUrl;
  };

  const filteredTimezones = TIMEZONES.filter(tz => 
    tz.toLowerCase().includes(timezoneSearch.toLowerCase())
  );

  const filteredStatuses = STATUS_OPTIONS.filter(s => 
    s.toLowerCase().includes(statusSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {!isLoading && (
                <Image
                  src={avatar}
                  alt="Profile"
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-500">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </label>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{displayName || fullName || 'Loading...'}</h1>
              <p className="text-gray-500">@{username}</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); updateProfile(); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-md border p-2"
                  minLength={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-md border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 block w-full rounded-md border p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 block w-full rounded-md border p-2"
                  rows={3}
                />
              </div>

              <div className="relative" ref={timezoneRef}>
                <label className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    setTimezoneSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search timezone..."
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
                {showSuggestions && filteredTimezones.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                    <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                      {filteredTimezones.map((tz) => (
                        <li
                          key={tz}
                          onClick={() => {
                            setTimezone(tz);
                            setShowSuggestions(false);
                          }}
                          className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                        >
                          {tz}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="relative" ref={statusRef}>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setStatusSearch(e.target.value);
                    setShowStatusSuggestions(true);
                  }}
                  onFocus={() => setShowStatusSuggestions(true)}
                  placeholder="Set status..."
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
                {showStatusSuggestions && filteredStatuses.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                    <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                      {filteredStatuses.map((s) => (
                        <li
                          key={s}
                          onClick={() => {
                            setStatus(s);
                            setShowStatusSuggestions(false);
                          }}
                          className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500"
                >
                  Save Changes
                </button>
                
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                >
                  Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
