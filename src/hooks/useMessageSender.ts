import { createClient } from '@/utils/supabase/client';
import { MessageData } from '@/types/chat';

export function useMessageSender() {
  const supabase = createClient();

  const sendMessage = async (
    content: string, 
    file: File | null, 
    userId: string, 
    channelId?: string, 
    receiverId?: string,
    threadId?: string
  ) => {
    try {
      let fileUrl: string | undefined;
      let fileType: string | undefined;
      let fileName: string | undefined;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const filePath = `${channelId || userId}/${timestamp}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileType = file.type;
        fileName = file.name;
      }

      const messageData: MessageData = {
        content: content.trim(),
        user_id: userId,
        is_direct_message: !!receiverId,
        thread_id: threadId,
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
        channel_id: !receiverId ? channelId : undefined,
        receiver_id: receiverId || undefined
      };

      // First, save to Supabase
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      // Then, upsert to Pinecone
      try {
        const response = await fetch('/api/chat/upsert-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content.trim(),
            metadata: {
              message_id: newMessage.id,
              user_id: userId,
              channel_id: channelId,
              receiver_id: receiverId,
              thread_id: threadId,
              timestamp: newMessage.created_at,
              message_type: receiverId ? 'dm' : 'channel'
            }
          })
        });

        if (!response.ok) {
          console.error('Failed to upsert message to Pinecone:', await response.text());
        }
      } catch (pineconeError) {
        // Log error but don't fail the message send
        console.error('Error upserting to Pinecone:', pineconeError);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return { sendMessage };
} 