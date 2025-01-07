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

      // If we have fewer than 2 real users, add example users
      if (realUsers.length < 2) {
        const exampleUsers = [
          { id: 'example1', full_name: 'Austen Allred', online: true },
          { id: 'example2', full_name: 'Joe Liemandt', online: false }
        ].slice(0, 2 - realUsers.length);

        setUsers([...realUsers, ...exampleUsers]);
      } else {
        setUsers(realUsers);
      }
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