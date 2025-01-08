-- Drop all auth users and storage items
TRUNCATE auth.users CASCADE;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar view policy" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';


-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_default_workspace();

-- Drop all existing tables in the correct order
DROP TABLE IF EXISTS saved_items CASCADE;
DROP TABLE IF EXISTS mentions CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS channel_members CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop storage bucket if exists
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar view policy" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';

-- Users table (complete)
CREATE TABLE public.users (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text not null,
  display_name text,
  avatar_url text default 'defpropic.jpg',
  bio text default '',
  email text not null,
  status text default 'active',
  status_message text,
  timezone text,
  online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint username_length check (char_length(username) >= 3)
);

-- Workspaces table
CREATE TABLE public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  avatar_url text,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workspace members
CREATE TABLE public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

-- Channels table
CREATE TABLE public.channels (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  is_private boolean default false,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, name)
);

-- Channel members
CREATE TABLE public.channel_members (
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (channel_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  user_id uuid references public.users(id) not null,
  channel_id uuid references public.channels(id),
  thread_id uuid references public.messages(id),
  is_direct_message boolean default false,
  receiver_id uuid references public.users(id),
  parent_message_id uuid references public.messages(id),
  edited_at timestamptz,
  is_pinned boolean default false,
  has_attachments boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_message_type check (
    (is_direct_message = true and receiver_id is not null and channel_id is null) or
    (is_direct_message = false and receiver_id is null and channel_id is not null)
  )
);

-- Reactions table
CREATE TABLE public.reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

-- Attachments table
CREATE TABLE public.attachments (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  file_url text not null,
  file_type text not null,
  file_name text not null,
  file_size integer not null,
  created_at timestamptz default now()
);

-- Mentions table
CREATE TABLE public.mentions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(message_id, user_id)
);

-- Saved items (bookmarks)
CREATE TABLE public.saved_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, message_id)
);

-- Function to create default workspace and channels
CREATE OR REPLACE FUNCTION public.create_default_workspace()
RETURNS void AS $$
DECLARE
  workspace_id uuid;
BEGIN
  -- Create default workspace
  INSERT INTO public.workspaces (id, name, slug, description)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'ChatGenius',
    'chatgenius',
    'Welcome to ChatGenius!'
  )
  RETURNING id INTO workspace_id;

  -- Create default channels
  INSERT INTO public.channels (workspace_id, name, description, is_private)
  VALUES 
    (workspace_id, 'general', 'General discussion', false),
    (workspace_id, 'random', 'Random conversations', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup
-- Drop and recreate the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert the new user
  INSERT INTO public.users (
    id, 
    username,
    full_name,
    display_name,
    avatar_url,
    email,
    status,
    bio,
    online,
    last_seen
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username',  -- Use username from metadata instead of email
    coalesce(new.raw_user_meta_data->>'full_name', 'Anonymous User'),
    coalesce(new.raw_user_meta_data->>'display_name', null),
    'defpropic.jpg',
    new.email,
    'active',
    '',
    false,
    now()
  );

  -- Add user to default workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new.id,
    'member'
  );

  -- Add user to default channels
  INSERT INTO public.channel_members (channel_id, user_id, role)
  SELECT id, new.id, 'member'
  FROM public.channels
  WHERE workspace_id = '00000000-0000-0000-0000-000000000000';

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- Initialize default workspace and channels
SELECT create_default_workspace();

-- Create storage bucket and policies for avatars
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true);

create policy "Avatar upload policy"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );

create policy "Avatar view policy"
  on storage.objects for select
  using ( bucket_id = 'avatars' );