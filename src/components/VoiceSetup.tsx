import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  preview_text?: string;
  is_custom: boolean;
  is_active: boolean;
  settings?: any;
  voice_preference?: any;
  category: 'premade' | 'cloned';  // Keep for backward compatibility
}

interface Recording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  storage_path?: string;  // Path in Supabase storage
  type: 'recording' | 'upload';  // Add type to distinguish between recordings and uploads
}

interface User {
  id: string;
  full_name: string;
  user_metadata?: {
    full_name?: string;
  };
  // ... other user properties
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function VoiceSetup() {
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedDefaultVoice, setSelectedDefaultVoice] = useState('');
  const [selectedCustomVoice, setSelectedCustomVoice] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'default' | 'custom' | null>('default');
  const [isCustomVoice, setIsCustomVoice] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recordingsDropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const supabase = createClient();
  const {
    isRecording,
    audioBlob,
    error,
    duration,
    startRecording,
    stopRecording: stopRecordingHook,
  } = useVoiceRecorder();
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const defaultContentRef = useRef<HTMLDivElement>(null);
  const customContentRef = useRef<HTMLDivElement>(null);
  const [defaultContentHeight, setDefaultContentHeight] = useState(0);
  const [customContentHeight, setCustomContentHeight] = useState(0);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
  const [editingVoiceName, setEditingVoiceName] = useState('');
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // Add this function to check if we're in a secure context
  const isSecureContext = () => {
    return window.isSecureContext;
  };

  // Add useEffect to check security context
  useEffect(() => {
    if (!isSecureContext()) {
      setSecurityWarning('Microphone access requires a secure (HTTPS) connection. Please ensure your site is served over HTTPS.');
    }
  }, []);

  // Add function to save recording to storage
  const saveRecordingToStorage = async (recording: Recording) => {
    if (!user?.id) return null;
    
    try {
      const fileName = `${recording.id}.mp3`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-samples')
        .upload(filePath, recording.blob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;
      return filePath;
    } catch (error) {
      console.error('Error saving recording:', error);
      return null;
    }
  };

  // Add function to fetch recordings from storage
  const fetchStoredRecordings = async () => {
    if (!user?.id) return;
    
    try {
      const { data: files, error: storageError } = await supabase.storage
        .from('voice-samples')
        .list(user.id);

      if (storageError) throw storageError;

      const recordingsPromises = files.map(async (file) => {
        try {
          const filePath = `${user.id}/${file.name}`;
          const { data: { publicUrl } } = supabase.storage
            .from('voice-samples')
            .getPublicUrl(filePath);
          
          const response = await fetch(publicUrl);
          if (!response.ok) {
            console.warn(`File ${filePath} is not accessible, skipping...`);
            return null;
          }

          const blob = await response.blob();
          const duration = await getAudioDuration(blob);

          const recording: Recording = {
            id: file.name.replace('.mp3', ''),
            blob,
            duration,
            timestamp: Date.now(),
            storage_path: filePath,
            type: 'upload'
          };
          return recording;
        } catch (error) {
          console.warn(`Error processing file ${file.name}:`, error);
          return null;
        }
      });

      const loadedRecordings = (await Promise.all(recordingsPromises))
        .filter((recording): recording is Recording => recording !== null);
      
      setRecordings(loadedRecordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setRecordings([]);
    }
  };

  // Add useEffect to load recordings on mount
  useEffect(() => {
    if (user?.id) {
      fetchStoredRecordings();
    }
  }, [user?.id]);

  useEffect(() => {
    if (audioBlob) {
      const timestamp = Date.now();
      const newRecording: Recording = {
        id: timestamp.toString(),
        blob: audioBlob,
        duration: duration,
        timestamp,
        type: 'recording'
      };
      setCurrentRecording(newRecording);
    }
  }, [audioBlob, duration]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const initializeVoiceSettings = async () => {
      if (user?.id) {
        await fetchVoices();
        await fetchUserVoice(); // This will now set the correct section
      }
    };

    initializeVoiceSettings();

    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (recordingsDropdownRef.current && !recordingsDropdownRef.current.contains(event.target as Node)) {
        setIsRecordingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user?.id]); // Only re-run when user ID changes

  const fetchVoices = async () => {
    try {
      console.log('Fetching voices...');
      // Update the API URL to use environment variable
      const response = await fetch(`${API_URL}/voices/`);
      const data = await response.json();
      
      // Get premade voices (ensure unique)
      const premadeVoices = Array.from(
        new Map(
          data
            .filter((voice: Voice) => voice.category === 'premade')
            .map((voice: Voice) => [voice.voice_id, voice])
        ).values()
      ) as Voice[];
      
      // Get custom voices from Supabase
      const { data: customVoicesData, error } = await supabase
        .from('voice_preferences')
        .select('*')
        .eq('is_custom', true)
        .eq('user_id', user?.id);

      if (error) throw error;

      console.log('Custom voices from DB:', customVoicesData);
      
      // Convert DB voices to Voice type
      const customVoices = customVoicesData.map(dbVoice => ({
        voice_id: dbVoice.voice_id,
        name: dbVoice.voice_name,
        preview_url: dbVoice.preview_url,
        preview_text: dbVoice.preview_text,
        is_custom: true,
        is_active: dbVoice.is_active,
        category: 'cloned' as const
      }));
      
      const allVoices = [...premadeVoices, ...customVoices];
      console.log('All voices:', { premadeVoices, customVoices, allVoices });
      setVoices(allVoices);
      return data;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  };

  const fetchUserVoice = async () => {
    if (!user?.id) return;
    
    try {
      const { data: activeVoice, error } = await supabase
        .from('voice_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (activeVoice) {
        if (activeVoice.is_custom) {
          setSelectedCustomVoice(activeVoice.voice_id);
          setSelectedDefaultVoice('');
          setIsCustomVoice(true);
          setActiveSection('custom');
          localStorage.setItem('voiceSection', 'custom');
        } else {
          setSelectedDefaultVoice(activeVoice.voice_id);
          setSelectedCustomVoice('');
          setIsCustomVoice(false);
          setActiveSection('default');
          localStorage.setItem('voiceSection', 'default');
        }
      } else {
        // If no active voice, check localStorage
        const savedSection = localStorage.getItem('voiceSection') as 'default' | 'custom' | null;
        if (savedSection) {
          setActiveSection(savedSection);
          setIsCustomVoice(savedSection === 'custom');
        } else {
          // Default to 'default' section if nothing is saved
          setSelectedCustomVoice('');
          setSelectedDefaultVoice('');
          setIsCustomVoice(false);
          setActiveSection('default');
          localStorage.setItem('voiceSection', 'default');
        }
      }
    } catch (error) {
      console.error('Error fetching user voice:', error);
    }
  };

  const handleVoiceSelect = async (voiceId: string) => {
    try {
      setLoading(true);
      setSelectedDefaultVoice(voiceId);
      setIsOpen(false);

      // Find the selected voice to get its name
      const selectedVoice = voices.find(v => v.voice_id === voiceId);
      if (!selectedVoice) throw new Error('Voice not found');

      // First deactivate all existing voice preferences
      await supabase
        .from('voice_preferences')
        .update({ is_active: false })
        .eq('user_id', user?.id);

      // Then check if preference exists
      const { data: existingPref } = await supabase
        .from('voice_preferences')
        .select('id')
        .eq('user_id', user?.id)
        .eq('voice_id', voiceId)
        .maybeSingle();

      if (existingPref) {
        // Update existing preference
        const { error } = await supabase
          .from('voice_preferences')
          .update({ 
            is_active: true,
            voice_name: selectedVoice.name,
            preview_text: `This is the ${selectedVoice.name} voice.`,
            preview_url: selectedVoice.preview_url || '',
            is_custom: false
          })
          .eq('id', existingPref.id);

        if (error) throw error;
      } else {
        // Insert new preference
        const { error } = await supabase
          .from('voice_preferences')
          .insert({ 
            user_id: user?.id,
            voice_id: voiceId,
            voice_name: selectedVoice.name,
            preview_text: `This is the ${selectedVoice.name} voice.`,
            preview_url: selectedVoice.preview_url || '',
            is_custom: false,
            is_active: true
          });

        if (error) throw error;
      }
      setIsCustomVoice(false);
    } catch (error) {
      console.error('Error updating default voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomVoiceSelect = async (voiceId: string) => {
    try {
      setLoading(true);
      setSelectedCustomVoice(voiceId);
      setIsRecordingsOpen(false);

      const selectedVoice = voices.find(v => v.voice_id === voiceId);
      if (!selectedVoice) throw new Error('Voice not found');

      // First deactivate all existing voice preferences
      await supabase
        .from('voice_preferences')
        .update({ is_active: false })
        .eq('user_id', user?.id);

      // Update or insert preference
      const { data: existingPref } = await supabase
        .from('voice_preferences')
        .select('id')
        .eq('user_id', user?.id)
        .eq('voice_id', voiceId)
        .maybeSingle();

      if (existingPref) {
        const { error } = await supabase
          .from('voice_preferences')
          .update({ is_active: true })
          .eq('id', existingPref.id);

        if (error) throw error;
      }
      setIsCustomVoice(true);
    } catch (error) {
      console.error('Error updating custom voice:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add utility function to verify URL is accessible
  const verifyUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn('URL not accessible:', error);
      return false;
    }
  };

  const playPreview = async (voice: Voice) => {
    if (!voice.preview_url) return;
    
    try {
      // Verify URL is accessible before attempting to play
      const isValid = await verifyUrl(voice.preview_url);
      if (!isValid) {
        console.warn(`Preview URL not accessible for voice ${voice.voice_id}`);
        return;
      }

      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setPlayingPreview(null);
      }

      // Create and play new audio
      const audio = new Audio(voice.preview_url);
      setCurrentAudio(audio);
      setPlayingPreview(voice.voice_id);
      
      audio.onended = () => {
        setPlayingPreview(null);
        setCurrentAudio(null);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing preview:', error);
      setPlayingPreview(null);
      setCurrentAudio(null);
    }
  };

  const getSelectedVoiceName = () => {
    const voiceId = activeSection === 'default' ? selectedDefaultVoice : selectedCustomVoice;
    const voice = voices.find(v => v.voice_id === voiceId);
    return voice ? voice.name : activeSection === 'default' ? 'Select a voice' : 'No trained voice';
  };

  const trainAndSetVoice = async (recording: Recording) => {
    if (!user?.id) return;
    
    try {
      setIsTraining(true);
      const previewText = `Hi, I'm ${user.user_metadata?.full_name || 'your AI assistant'}. This is my AI voice.`;
      
      const formData = new FormData();
      formData.append('file', recording.blob, 'voice.mp3');
      formData.append('name', `${user.user_metadata?.full_name || 'Custom'}'s Voice`);
      formData.append('preview_text', previewText);
      formData.append('user_id', user.id);
      
      console.log('Training voice with:', {
        name: `${user.user_metadata?.full_name || 'Custom'}'s Voice`,
        preview_text: previewText,
        user_id: user.id,
        file_size: recording.blob.size,
        file_type: recording.blob.type
      });
      
      const response = await fetch('http://localhost:8000/voices/train', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Training error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to train voice: ${errorData}`);
      }
      
      const data = await response.json();
      console.log('Training response:', data);
      
      if (data.voice_preference) {
        setSelectedCustomVoice(data.voice_id);
        setSelectedDefaultVoice('');
        await fetchVoices();
        localStorage.setItem('voiceSection', 'custom');
      }
      
    } catch (error) {
      console.error('Error training voice:', error);
      alert(error instanceof Error ? error.message : 'Failed to train voice. Please try again.');
    } finally {
      setIsTraining(false);
      setCurrentRecording(null);
    }
  };

  const handleTrainVoice = async () => {
    if (!currentRecording) return;
    
    try {
      setIsTraining(true);
      setActiveSection('custom');
      setIsCustomVoice(true);
      
      await trainAndSetVoice(currentRecording);
      
      // After successful training, update UI
      setCurrentRecording(null);
      setIsRecordingsOpen(false);
      
    } catch (error) {
      console.error('Error in handleTrainVoice:', error);
      alert('Failed to train voice. Please try again.');
    } finally {
      setIsTraining(false);
    }
  };

  // Add function to calculate audio duration
  const getAudioDuration = (file: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
      };
    });
  };

  // Modify handleFileUpload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setLoading(true);
      
      // Calculate duration for the uploaded file
      const duration = await getAudioDuration(file);
      
      // Create a new recording object
      const newRecording: Recording = {
        id: Date.now().toString(),
        blob: file,
        duration,
        timestamp: Date.now(),
        type: 'upload'  // Mark as upload
      };
      
      // Set as current recording instead of saving to storage immediately
      setCurrentRecording(newRecording);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleStopRecording = async () => {
    await stopRecordingHook();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const deleteRecording = async (id: string) => {
    const recording = recordings.find(r => r.id === id);
    if (!recording?.storage_path) return;

    try {
      // First delete from database to prevent future fetches
      const { error: dbError } = await supabase
        .from('voice_training_samples')
        .delete()
        .eq('file_path', recording.storage_path);

      if (dbError) throw dbError;

      // Then delete from storage
      const { error: storageError } = await supabase.storage
        .from('voice-samples')
        .remove([recording.storage_path]);

      // Even if storage deletion fails, we should update the UI
      if (storageError) {
        console.warn('Error deleting from storage:', storageError);
      }

      // Update state
      setRecordings(prev => prev.filter(rec => rec.id !== id));
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
      }

      // Also clean up any voice preferences that might be using this recording
      if (isCustomVoice && selectedCustomVoice === id) {
        const { error: prefError } = await supabase
          .from('voice_preferences')
          .update({ 
            voice_id: null,
            is_custom: false 
          })
          .eq('user_id', user?.id);

        if (prefError) {
          console.warn('Error updating voice preferences:', prefError);
        }
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording. Please try again.');
    }
  };

  const playRecording = async (recording: Recording) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setPlayingRecordingId(null);
      }

      // Create and play new audio
      const audio = new Audio(URL.createObjectURL(recording.blob));
      setCurrentAudio(audio);
      setPlayingRecordingId(recording.id);
      
      audio.onended = () => {
        setPlayingRecordingId(null);
        setCurrentAudio(null);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing recording:', error);
      setPlayingRecordingId(null);
      setCurrentAudio(null);
    }
  };

  // Modify handleSectionToggle to use new schema
  const handleSectionToggle = async (section: 'default' | 'custom') => {
    if (activeSection === section) return;
    
    try {
      setLoading(true);
      setActiveSection(section);
      localStorage.setItem('voiceSection', section);
      
      // First deactivate all existing voice preferences
      await supabase
        .from('voice_preferences')
        .update({ is_active: false })
        .eq('user_id', user?.id);
      
      if (section === 'default' && selectedDefaultVoice) {
        // Reactivate the selected default voice
        const voice = voices.find(v => v.voice_id === selectedDefaultVoice);
        if (voice) {
          await handleVoiceSelect(selectedDefaultVoice);
        }
      } else if (section === 'custom' && selectedCustomVoice) {
        // Reactivate the selected custom voice
        const voice = voices.find(v => v.voice_id === selectedCustomVoice);
        if (voice) {
          await handleCustomVoiceSelect(selectedCustomVoice);
        }
      }
      
      setIsCustomVoice(section === 'custom');
      
    } catch (error) {
      console.error('Error updating voice preference:', error);
      setActiveSection(activeSection);
      setIsCustomVoice(activeSection === 'custom');
    } finally {
      setLoading(false);
    }
  };

  // Add effect to measure content height when content changes
  useEffect(() => {
    if (defaultContentRef.current) {
      setDefaultContentHeight(defaultContentRef.current.scrollHeight);
    }
    if (customContentRef.current) {
      setCustomContentHeight(customContentRef.current.scrollHeight);
    }
  }, [voices, recordings, selectedDefaultVoice, selectedCustomVoice]);

  // Add new function to delete trained voice
  const deleteTrainedVoice = async (voiceId: string) => {
    try {
      setLoading(true);
      
      // Delete from voice_preferences
      const { error: prefError } = await supabase
        .from('voice_preferences')
        .delete()
        .eq('voice_id', voiceId)
        .eq('user_id', user?.id);

      if (prefError) throw prefError;

      // Delete from voices API
      const response = await fetch(`http://localhost:8000/voices/${voiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete voice from API');
      }

      // Update local state
      setVoices(prev => prev.filter(v => v.voice_id !== voiceId));
      if (selectedCustomVoice === voiceId) {
        setSelectedCustomVoice('');
      }
      if (selectedDefaultVoice === voiceId) {
        setSelectedDefaultVoice('');
      }

      await fetchVoices(); // Refresh the list
    } catch (error) {
      console.error('Error deleting trained voice:', error);
      alert('Failed to delete voice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameVoice = async (voiceId: string, newName: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('voice_preferences')
        .update({ voice_name: newName })
        .eq('voice_id', voiceId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setVoices(prev => prev.map(voice => 
        voice.voice_id === voiceId ? { ...voice, name: newName } : voice
      ));
      setEditingVoiceId(null);
      setEditingVoiceName('');
      
    } catch (error) {
      console.error('Error renaming voice:', error);
      alert('Failed to rename voice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Voice Settings</h2>
      
      <div className="space-y-6">
        {/* Default Voice Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleSectionToggle('default')}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                ${activeSection === 'default' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300 hover:border-gray-400'}`}
            >
              {activeSection === 'default' && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </button>
            <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => handleSectionToggle('default')}>
              Default Voice
            </label>
          </div>
          
          <div className="relative">
            <div 
              className={`transition-all duration-300 ease-in-out ${
                activeSection === 'default' 
                  ? 'max-h-[500px] opacity-100 visible'
                  : 'max-h-0 opacity-0 invisible'
              }`}
            >
              <div ref={defaultContentRef} className="pl-8">
                <p className="text-sm text-gray-500 mb-2">
                  Select a voice that will be used by your AI avatar when speaking to others.
                </p>
                
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(!isOpen);
                    }}
                    className="relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <span className="block truncate">{getSelectedVoiceName()}</span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="absolute z-[100] mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none">
                      {voices
                        .filter(voice => !voice.is_custom)
                        .map((voice) => (
                          <div
                            key={voice.voice_id}
                            className={`
                              flex items-center justify-between px-3 py-2 cursor-pointer
                              ${selectedDefaultVoice === voice.voice_id ? 'bg-blue-100' : 'hover:bg-gray-100'}
                            `}
                          >
                            <div
                              className="flex-1"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleVoiceSelect(voice.voice_id);
                              }}
                            >
                              {voice.name}
                            </div>
                            {voice.preview_url && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  playPreview(voice);
                                }}
                                className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                              >
                                {playingPreview === voice.voice_id ? (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Voice Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleSectionToggle('custom')}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                ${activeSection === 'custom' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300 hover:border-gray-400'}`}
            >
              {activeSection === 'custom' && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </button>
            <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => handleSectionToggle('custom')}>
              Create Custom Voice
            </label>
          </div>
          
          <div className="relative">
            <div 
              className={`transition-all duration-300 ease-in-out ${
                activeSection === 'custom' 
                  ? 'max-h-[500px] opacity-100 visible'
                  : 'max-h-0 opacity-0 invisible'
              }`}
            >
              <div ref={customContentRef} className="pl-8">
                <p className="text-sm text-gray-500 mb-2">
                  Record your voice or upload an audio file to create a custom AI voice that sounds like you.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isRecording) {
                          alert('Please record at least 1 minute of clear speech for better voice cloning results. Optimal length is 3-10 minutes.');
                        }
                        isRecording ? handleStopRecording() : startRecording();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                        isRecording 
                          ? 'bg-red-600 hover:bg-red-500' 
                          : 'bg-red-600 hover:bg-red-500'
                      } text-white`}
                      disabled={loading}
                    >
                      {isRecording ? (
                        <>
                          <span>Stop Recording</span>
                          <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse"/>
                          <span className="ml-2 text-sm">{formatTime(duration)}</span>
                        </>
                      ) : (
                        <>
                          <span>Start Recording</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                        </>
                      )}
                    </button>

                    {/* Add Upload Button */}
                    <label
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-400 cursor-pointer"
                    >
                      <span>Upload Audio</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTrainVoice();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                      disabled={!currentRecording || loading || isTraining}
                    >
                      {isTraining ? (
                        <>
                          <span>Training...</span>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </>
                      ) : (
                        <>
                          <span>Train Voice</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  {currentRecording && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md w-fit">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isPlaying) {
                            currentAudio?.pause();
                            setIsPlaying(false);
                          } else {
                            playRecording(currentRecording);
                            setIsPlaying(true);
                          }
                        }}
                        className="text-gray-600 hover:text-blue-600"
                      >
                        {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <span className="text-sm text-gray-600">
                        Current Recording ({formatTime(duration)})
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isPlaying) {
                            currentAudio?.pause();
                            setIsPlaying(false);
                          }
                          setCurrentRecording(null);
                        }}
                        className="text-gray-400 hover:text-red-600 ml-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Trained Voices Dropdown */}
                  <div className="relative" ref={recordingsDropdownRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsRecordingsOpen(!isRecordingsOpen);
                      }}
                      className="relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    >
                      <span className="block truncate">
                        {selectedCustomVoice ? getSelectedVoiceName() : 'Select a trained voice'}
                      </span>
                      <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </button>

                    {isRecordingsOpen && (
                      <div className="absolute z-[100] mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none">
                        {(() => {
                          const customVoices = voices.filter(voice => voice.is_custom);
                          console.log('Filtered custom voices for dropdown:', customVoices);
                          return customVoices.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              No trained voices yet
                            </div>
                          ) : (
                            customVoices.map((voice) => (
                              <div
                                key={voice.voice_id}
                                className={`
                                  flex items-center justify-between px-3 py-2 cursor-pointer
                                  ${selectedCustomVoice === voice.voice_id ? 'bg-blue-100' : 'hover:bg-gray-100'}
                                `}
                              >
                                <div className="flex flex-col flex-1">
                                  {editingVoiceId === voice.voice_id ? (
                                    <div
                                      className="flex items-center gap-2"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <input
                                        type="text"
                                        value={editingVoiceName}
                                        onChange={(e) => setEditingVoiceName(e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm border rounded"
                                        placeholder="Enter new name"
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleRenameVoice(voice.voice_id, editingVoiceName);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleRenameVoice(voice.voice_id, editingVoiceName);
                                        }}
                                        className="p-1 text-green-600 hover:text-green-700"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingVoiceId(null);
                                          setEditingVoiceName('');
                                        }}
                                        className="p-1 text-red-600 hover:text-red-700"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCustomVoiceSelect(voice.voice_id);
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <span>{voice.name}</span>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingVoiceId(voice.voice_id);
                                          setEditingVoiceName(voice.name);
                                        }}
                                        className="p-1 text-gray-400 hover:text-blue-600"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      playPreview(voice);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600"
                                  >
                                    {playingPreview === voice.voice_id ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (confirm('Are you sure you want to delete this voice?')) {
                                        deleteTrainedVoice(voice.voice_id);
                                      }
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 