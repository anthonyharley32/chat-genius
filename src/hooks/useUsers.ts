'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type User = {
  id: string;
  full_name: string;
  online: boolean;
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function getUsers() {
      const { data: realUsers, error } = await supabase
        .from('users')
        .select('id, full_name, online')
        .order('full_name');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(realUsers);
    }

    getUsers();

    // Subscribe to changes
    const channel = supabase
      .channel('users_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, 
        () => getUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return users;
} 