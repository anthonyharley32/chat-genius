'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type User = {
  id: string;
  full_name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function getUsers() {
      const { data: realUsers, error } = await supabase
        .from('users')
        .select('id, full_name, online, status')
        .order('full_name')
        .returns<User[]>();

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(realUsers || []);
    }

    getUsers();

    // Subscribe to changes
    const channel = supabase
      .channel('users_channel')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users'
        }, 
        (payload) => {
          setUsers(currentUsers => 
            currentUsers.map(user => 
              user.id === payload.new.id 
                ? { ...user, status: payload.new.status }
                : user
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return users;
} 