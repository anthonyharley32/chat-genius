'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserStore } from '@/store/userStore';
import { StatusDot } from '@/components/StatusDot';
import { statusType, StatusType } from '@/types/status';

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
  const [status, setStatus] = useState<StatusType>('online');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
    };
    checkUser();
  }, [router, supabase.auth]);

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
          if (data.avatar_url === 'defpropic.jpg' || data.avatar_url === '/defpropic.jpg') {
            setAvatar('/defpropic.jpg');
          } else {
            const avatarUrl = supabase.storage
              .from('avatars')
              .getPublicUrl(data.avatar_url)
              .data.publicUrl;
            setAvatar(avatarUrl);
          }
        } else {
          setAvatar('/defpropic.jpg');
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

  async function removeAvatar() {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Update the user record to use default avatar
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: 'defpropic.jpg' })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setAvatar('/defpropic.jpg');
    } catch (error) {
      console.error('Error removing avatar:', error);
    } finally {
      setUploading(false);
    }
  }

  const getAvatarUrl = (path: string) => {
    if (path === 'defpropic.jpg' || path === '/defpropic.jpg') {
      return '/defpropic.jpg';
    }
    if (path.startsWith('http') || path.startsWith('/')) {
      return path;
    }
    return supabase.storage
      .from('avatars')
      .getPublicUrl(path)
      .data.publicUrl;
  };

  const filteredTimezones = TIMEZONES.filter(tz => 
    tz.toLowerCase().includes(timezoneSearch.toLowerCase())
  );

  const filteredStatuses = Object.entries(statusType || {}).filter(([key, { label }]) => 
    label.toLowerCase().includes(statusSearch.toLowerCase())
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
                  className="rounded-full aspect-square object-cover"
                />
              )}
              <label className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-500 flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </label>
              {avatar !== '/defpropic.jpg' && (
                <button
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="absolute -bottom-2 -left-2 w-6 h-6 bg-gray-400 rounded-full cursor-pointer hover:bg-gray-500 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
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
                <div className="mt-1 relative">
                  <div className="flex items-center">
                    <StatusDot status={status} size="md" />
                    <input
                      type="text"
                      value={status.charAt(0).toUpperCase() + status.slice(1)}
                      readOnly
                      onClick={() => setShowStatusSuggestions(true)}
                      onFocus={() => setShowStatusSuggestions(true)}
                      placeholder="Set status..."
                      className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 cursor-pointer ml-2"
                    />
                  </div>
                </div>
                
                {showStatusSuggestions && (
                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                    <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                      {(['online', 'away', 'busy', 'offline'] as const).map((statusKey) => (
                        <li
                          key={statusKey}
                          onClick={() => {
                            setStatus(statusKey);
                            setShowStatusSuggestions(false);
                          }}
                          className="cursor-pointer px-3 py-2 hover:bg-gray-100 flex items-center"
                        >
                          <StatusDot status={statusKey} size="md" />
                          <span className="ml-2">
                            {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                          </span>
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
