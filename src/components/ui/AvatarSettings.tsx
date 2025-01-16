import { useState, useEffect } from 'react';
import { useAIMemory } from '@/hooks/useAIMemory';

export function AvatarSettings() {
  const [instructions, setInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { avatarSettings, updateAvatarSettings } = useAIMemory();

  useEffect(() => {
    if (avatarSettings?.instructions) {
      setInstructions(avatarSettings.instructions);
    }
  }, [avatarSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await updateAvatarSettings(instructions);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Error saving avatar settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        AI Avatar Settings
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="instructions" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Avatar Instructions
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Customize how your AI avatar behaves and responds. These instructions will guide its personality and responses.
          </p>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Example: Be friendly and casual, use emojis occasionally, and focus on being helpful while maintaining a positive tone."
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            rows={4}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Instructions'}
          </button>
          {saveStatus === 'success' && (
            <span className="text-green-500 text-sm">Settings saved successfully!</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-500 text-sm">Error saving settings. Please try again.</span>
          )}
        </div>
      </form>
    </div>
  );
} 