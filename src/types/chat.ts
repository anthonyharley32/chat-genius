export type Message = {
  id: string;
  content: string;
  user_id: string;
  channel_id?: string;
  is_direct_message: boolean;
  receiver_id?: string;
  created_at: string;
  image_url?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  users?: { full_name: string };
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
};

export type MessageData = {
  content: string;
  user_id: string;
  channel_id?: string;
  receiver_id?: string;
  is_direct_message: boolean;
  image_url?: string;
}; 