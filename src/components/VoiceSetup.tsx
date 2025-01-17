import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category: 'premade' | 'cloned';
}

interface Recording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  storage_path?: string;  // Path in Supabase storage
  type: 'recording' | 'upload';  // Add type to distinguish between recordings and uploads
}

export function VoiceSetup() {
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
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
    startRecording,
    stopRecording: stopRecordingHook,
  } = useVoiceRecorder();
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const defaultContentRef = useRef<HTMLDivElement>(null);
  const customContentRef = useRef<HTMLDivElement>(null);
  const [defaultContentHeight, setDefaultContentHeight] = useState(0);
  const [customContentHeight, setCustomContentHeight] = useState(0);

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
      
      // Save record to voice_training_samples table
      const { error: dbError } = await supabase
        .from('voice_training_samples')
        .insert({
          file_path: filePath,
          status: 'pending'
        });

      if (dbError) throw dbError;
      
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
      // Get list of files from storage
      const { data: files, error: storageError } = await supabase.storage
        .from('voice-samples')
        .list(user.id);

      if (storageError) throw storageError;

      // Get the training samples data
      const { data: samples, error: dbError } = await supabase
        .from('voice_training_samples')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (dbError) throw dbError;

      // Create signed URLs for each file
      const recordingsPromises = files.map(async (file) => {
        try {
          const filePath = `${user.id}/${file.name}`;
          const { data: { publicUrl } } = supabase.storage
            .from('voice-samples')
            .getPublicUrl(filePath);

          const sample = samples?.find(s => s.file_path === filePath);
          
          // Try to fetch the file to verify it exists and is accessible
          const response = await fetch(publicUrl);
          if (!response.ok) {
            console.warn(`File ${filePath} is not accessible, skipping...`);
            // If file is not accessible, we should clean up the database record
            if (sample) {
              await supabase
                .from('voice_training_samples')
                .delete()
                .eq('file_path', filePath);
            }
            return null;
          }

          const blob = await response.blob();
          const duration = await getAudioDuration(blob);

          const recording: Recording = {
            id: file.name.replace('.mp3', ''),
            blob,
            duration,
            timestamp: sample?.created_at ? new Date(sample.created_at).getTime() : Date.now(),
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
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const initializeVoices = async () => {
      await fetchVoices();
      await fetchUserVoice();
    };

    initializeVoices();

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
  }, [user]);

  const fetchVoices = async () => {
    try {
      const response = await fetch('http://localhost:8000/voices/');
      const data = await response.json();
      
      // Get premade voices
      const premadeVoices = data.filter((voice: Voice) => voice.category === 'premade');
      
      // Get only the latest custom voice for each name that has a preview URL
      const customVoices = data
        .filter((voice: Voice) => 
          voice.category === 'cloned' && 
          voice.name !== 'test-voice' &&
          voice.preview_url // Only include voices with preview URLs
        )
        .reduce((acc: Voice[], voice: Voice) => {
          // Find existing voice with same name
          const existingVoice = acc.find(v => v.name === voice.name);
          
          // If no existing voice or this one is newer (based on voice_id), use this one
          if (!existingVoice || voice.voice_id > existingVoice.voice_id) {
            // Remove existing voice if any
            const filtered = acc.filter(v => v.name !== voice.name);
            return [...filtered, voice];
          }
          return acc;
        }, []);

      setVoices([...premadeVoices, ...customVoices]);
      return data;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  };

  const fetchUserVoice = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('voice_preferences')
        .select('voice_id, is_custom_voice')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedVoice(data.voice_id);
        setIsCustomVoice(data.is_custom_voice || false);
        setActiveSection(data.is_custom_voice ? 'custom' : 'default');
      }
    } catch (error) {
      console.error('Error fetching user voice:', error);
    }
  };

  const handleVoiceSelect = async (voiceId: string) => {
    try {
      setLoading(true);
      setSelectedVoice(voiceId);
      setIsOpen(false);

      const { error } = await supabase
        .from('voice_preferences')
        .upsert({ 
          user_id: user?.id,
          voice_id: voiceId,
          auto_play: false,
          is_custom_voice: false // Set to false when selecting a default voice
        });

      if (error) throw error;
      setIsCustomVoice(false);
    } catch (error) {
      console.error('Error updating default voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const playPreview = async (voice: Voice) => {
    if (!voice.preview_url) return;
    
    try {
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
    const voice = voices.find(v => v.voice_id === selectedVoice);
    return voice ? voice.name : 'Select a voice';
  };

  const trainVoice = async () => {
    if (!selectedRecording) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedRecording.blob, 'recording.mp3');
      formData.append('name', `${user?.user_metadata?.full_name || 'Custom'}'s Voice`);
      formData.append('description', 'Personal voice clone created for AI avatar');
      
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      formData.append('user_id', user.id);

      const response = await fetch(`http://localhost:8000/voices/train`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const responseData = await response.json();
        console.error('Voice training error:', responseData);
        throw new Error(responseData.detail || 'Failed to train voice');
      }

      // Get the voice data from the response
      const voiceData = await response.json();
      
      // Store voice information in the database
      const { error: dbError } = await supabase
        .from('voice_preferences')
        .upsert({
          user_id: user.id,
          voice_id: voiceData.voice_id,
          voice_name: voiceData.name,
          voice_url: voiceData.voice_url,
          preview_url: voiceData.preview_url,
          is_custom_voice: true,
          category: 'cloned',
          auto_play: false
        });

      if (dbError) throw dbError;

      // Wait a moment for the voice to be processed before fetching the updated list
      setTimeout(async () => {
        await fetchVoices();
        alert('Voice training completed successfully!');
      }, 2000);

    } catch (error) {
      console.error('Error training voice:', error);
      alert('Failed to train voice. Please try again.');
    } finally {
      setLoading(false);
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
      
      // Save to storage and update state
      const storagePath = await saveRecordingToStorage(newRecording);
      if (storagePath) {
        const recordingWithPath = { ...newRecording, storage_path: storagePath };
        setRecordings(prev => {
          const updated = [recordingWithPath, ...prev].slice(0, 5);
          setSelectedRecording(recordingWithPath);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (audioBlob) {
      const newRecording: Recording = {
        id: Date.now().toString(),
        blob: audioBlob,
        duration: recordingTime,
        timestamp: Date.now(),
        type: 'recording'  // Mark as recording
      };
      
      // Save to storage and update state
      saveRecordingToStorage(newRecording).then(storagePath => {
        if (storagePath) {
          const recordingWithPath = { ...newRecording, storage_path: storagePath };
          setRecordings(prev => {
            const updated = [recordingWithPath, ...prev].slice(0, 5);
            setSelectedRecording(recordingWithPath);
            return updated;
          });
        }
      });
    }
  }, [audioBlob, recordingTime]);

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
      if (isCustomVoice && selectedVoice === id) {
        const { error: prefError } = await supabase
          .from('voice_preferences')
          .update({ 
            voice_id: null,
            is_custom_voice: false 
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

  // Modify handleSectionToggle to update voice preference
  const handleSectionToggle = async (section: 'default' | 'custom') => {
    // If clicking the already active section, don't do anything
    if (activeSection === section) return;
    
    try {
      setLoading(true);
      
      // Update the active section
      setActiveSection(section);
      
      // Update voice preference in database
      const { error } = await supabase
        .from('voice_preferences')
        .upsert({ 
          user_id: user?.id,
          voice_id: section === 'custom' ? selectedRecording?.id : selectedVoice,
          auto_play: false,
          is_custom_voice: section === 'custom'
        });

      if (error) throw error;
      
      // Update local state
      setIsCustomVoice(section === 'custom');
      
    } catch (error) {
      console.error('Error updating voice preference:', error);
      // Revert the UI if there was an error
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
  }, [voices, recordings, selectedVoice, selectedRecording]);

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
                      {voices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          className={`
                            flex items-center justify-between px-3 py-2 cursor-pointer
                            ${selectedVoice === voice.voice_id ? 'bg-blue-100' : 'hover:bg-gray-100'}
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
                      ))}
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
                          <span className="ml-2 text-sm">{formatTime(recordingTime)}</span>
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

                    {selectedRecording && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          trainVoice();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                        disabled={loading}
                      >
                        <span>Train Voice</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Recordings Dropdown */}
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
                        {selectedRecording 
                          ? `${selectedRecording.type === 'upload' ? 'File' : 'Recording'} from ${formatTimestamp(selectedRecording.timestamp)} (${formatTime(selectedRecording.duration)})`
                          : 'Select a recording'}
                      </span>
                      <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </button>

                    {isRecordingsOpen && (
                      <div className="absolute z-[100] mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none">
                        {recordings.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No recordings yet
                          </div>
                        ) : (
                          recordings.map((recording) => (
                            <div
                              key={recording.id}
                              className={`
                                flex items-center justify-between px-3 py-2 cursor-pointer
                                ${selectedRecording?.id === recording.id ? 'bg-blue-100' : 'hover:bg-gray-100'}
                              `}
                            >
                              <div
                                className="flex-1"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedRecording(recording);
                                  setIsRecordingsOpen(false);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{recording.type === 'upload' ? 'File' : 'Recording'} from {formatTimestamp(recording.timestamp)}</span>
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({formatTime(recording.duration)})
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    playRecording(recording);
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600"
                                >
                                  {playingRecordingId === recording.id ? (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
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
                                    deleteRecording(recording.id);
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
                        )}
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