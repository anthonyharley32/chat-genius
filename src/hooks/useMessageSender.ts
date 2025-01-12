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
          .upload(filePath, file);

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