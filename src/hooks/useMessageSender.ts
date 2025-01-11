import { createClient } from '@/utils/supabase/client';
import { MessageData } from '@/types/chat';

export function useMessageSender() {
  const supabase = createClient();

  const sendMessage = async (content: string, file: File | null, userId: string, channelId?: string, receiverId?: string) => {
    try {
      let imageUrl: string | undefined;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        imageUrl = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName).data.publicUrl;
      }

      const messageData: MessageData = {
        content: content.trim(),
        user_id: userId,
        is_direct_message: !!receiverId,
        image_url: imageUrl
      };

      if (receiverId) {
        messageData.receiver_id = receiverId;
      } else if (channelId) {
        messageData.channel_id = channelId;
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return { sendMessage };
} 