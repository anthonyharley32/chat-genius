-- Drop all auth users and storage items
TRUNCATE auth.users CASCADE;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar view policy" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';
DELETE FROM storage.objects WHERE bucket_id = 'message-attachments';
DELETE FROM storage.buckets WHERE id = 'message-attachments';


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
DROP POLICY IF EXISTS "Message attachments upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Message attachments view policy" ON storage.objects;

-- Users table (complete)
CREATE TABLE public.users (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text not null,
  display_name text,
  avatar_url text default 'defpropic.jpg',
  bio text default '',
  email text not null,
  status text default 'online' check (status in ('online', 'away', 'busy', 'offline')),
  status_message text,
  timezone text,
  online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint username_length check (char_length(username) >= 3)
  constraint status_check check (status IN ('online', 'away', 'busy', 'offline'));
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
  content_search tsvector generated always as (to_tsvector('english', content)) stored,
  user_id uuid references public.users(id) not null,
  channel_id uuid references public.channels(id),
  thread_id uuid references public.messages(id),
  is_direct_message boolean default false,
  receiver_id uuid references public.users(id),
  parent_message_id uuid references public.messages(id),
  edited_at timestamptz,
  is_pinned boolean default false,
  has_attachments boolean default false,
  image_url text,
  file_url text,
  file_type text,
  file_name text,
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

-- Unread messages table
CREATE TABLE public.unread_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  dm_user_id uuid references public.users(id) on delete cascade,
  last_read_at timestamptz default now(),
  unread_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_unread_type check (
    (channel_id is not null and dm_user_id is null) or
    (channel_id is null and dm_user_id is not null)
  ),
  unique(user_id, channel_id, dm_user_id)
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
    'online',
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

-- Create storage bucket and policies for message attachments
insert into storage.buckets (id, name, public) 
values ('message-attachments', 'message-attachments', true);

create policy "Message attachment upload policy"
  on storage.objects for insert
  with check (
    bucket_id = 'message-attachments' 
    and auth.role() = 'authenticated'
  );

create policy "Message attachment view policy"
  on storage.objects for select
  using ( bucket_id = 'message-attachments' );

-- Create a storage bucket for files if you haven't already
insert into storage.buckets (id, name, public) values ('files', 'files', true);

-- Set up storage policies for files
create policy "Files are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'files' );

create policy "Authenticated users can upload files"
  on storage.objects for insert
  with check ( bucket_id = 'files' AND auth.role() = 'authenticated' );

-- Create a GIN index for faster searching
create index messages_content_search_idx on messages using gin(content_search);

-- Enable the pg_trgm extension for partial word matching
create extension if not exists pg_trgm;

-- Add trigram index for partial word matching
create index messages_content_trgm_idx on messages using gin(content gin_trgm_ops);

-- Update the content_search column to include more configurations
alter table messages 
drop column if exists content_search;

alter table messages 
add column content_search tsvector 
generated always as (
  setweight(to_tsvector('english', coalesce(content, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'B')
) stored;

-- Function to increment unread count
CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- For channel messages
  IF NEW.channel_id IS NOT NULL THEN
    -- Don't increment for the sender's own messages
    INSERT INTO public.unread_messages (user_id, channel_id, unread_count)
    SELECT 
      cm.user_id,
      NEW.channel_id,
      1
    FROM public.channel_members cm
    WHERE cm.channel_id = NEW.channel_id
    AND cm.user_id != NEW.user_id
    ON CONFLICT (user_id, channel_id, dm_user_id)
    DO UPDATE SET 
      unread_count = CASE 
        -- Only increment if the user isn't the sender
        WHEN public.unread_messages.user_id != NEW.user_id THEN public.unread_messages.unread_count + 1
        ELSE public.unread_messages.unread_count
      END,
      updated_at = now();
  
  -- For direct messages
  ELSIF NEW.is_direct_message AND NEW.receiver_id IS NOT NULL THEN
    -- Skip if it's a self-message
    IF NEW.user_id != NEW.receiver_id THEN
      -- Create/update unread count for the receiver
      INSERT INTO public.unread_messages (user_id, dm_user_id, unread_count)
      VALUES (NEW.receiver_id, NEW.user_id, 1)
      ON CONFLICT (user_id, channel_id, dm_user_id)
      DO UPDATE SET 
        unread_count = public.unread_messages.unread_count + 1,
        updated_at = now();

      -- Also create a record for the sender (with count 0) if it doesn't exist
      INSERT INTO public.unread_messages (user_id, dm_user_id, unread_count)
      VALUES (NEW.user_id, NEW.receiver_id, 0)
      ON CONFLICT (user_id, channel_id, dm_user_id)
      DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS increment_unread_count_trigger ON public.messages;
CREATE TRIGGER increment_unread_count_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_unread_count();

-- Function to reset unread count
CREATE OR REPLACE FUNCTION public.reset_unread_count(
  p_user_id uuid,
  p_channel_id uuid DEFAULT NULL,
  p_dm_user_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.unread_messages
  SET 
    unread_count = 0,
    last_read_at = now(),
    updated_at = now()
  WHERE 
    user_id = p_user_id
    AND (
      (p_channel_id IS NOT NULL AND channel_id = p_channel_id)
      OR 
      (p_dm_user_id IS NOT NULL AND dm_user_id = p_dm_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;