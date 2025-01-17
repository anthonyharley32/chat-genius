import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
}

export function VoiceSetup() {
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const supabase = createClient();
  const {
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  useEffect(() => {
    fetchVoices();
    fetchUserVoice();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch('http://localhost:8000/voices/');
      const data = await response.json();
      setVoices(data);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const fetchUserVoice = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('default_voice_id')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data?.default_voice_id) {
        setSelectedVoice(data.default_voice_id);
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
        .from('users')
        .update({ default_voice_id: voiceId })
        .eq('id', user?.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating default voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const playPreview = async (voice: Voice) => {
    if (!voice.preview_url) return;
    
    try {
      setPlayingPreview(voice.voice_id);
      const audio = new Audio(voice.preview_url);
      audio.onended = () => setPlayingPreview(null);
      await audio.play();
    } catch (error) {
      console.error('Error playing preview:', error);
      setPlayingPreview(null);
    }
  };

  const getSelectedVoiceName = () => {
    const voice = voices.find(v => v.voice_id === selectedVoice);
    return voice ? voice.name : 'Select a voice';
  };

  const trainVoice = async () => {
    if (!audioBlob) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.mp3');
      formData.append('name', 'My Custom Voice');
      formData.append('description', 'Custom voice created from my recordings');

      const response = await fetch(`http://localhost:8000/voices/train?user_id=${user?.id}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to train voice');

      await fetchVoices();
    } catch (error) {
      console.error('Error training voice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Voice Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Voice</label>
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
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none">
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Create Custom Voice</label>
          <p className="text-sm text-gray-500 mb-2">
            Record your voice to create a custom AI voice that sounds like you.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isRecording ? stopRecording() : startRecording();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-blue-600 hover:bg-blue-500'
                } text-white`}
                disabled={loading}
              >
                {isRecording ? (
                  <>
                    <span>Stop Recording</span>
                    <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse"/>
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

              {audioBlob && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    trainVoice();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50"
                  disabled={loading}
                >
                  Train Voice
                </button>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            {audioBlob && (
              <div className="mt-2">
                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 