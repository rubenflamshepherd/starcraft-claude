import { useState, useEffect } from 'react';
import { useSelection } from '../contexts/SelectionContext';

const SOUND_FOLDERS = [
  { value: 'done', label: 'done', description: 'When Claude finishes' },
  { value: 'start', label: 'start', description: 'Session start' },
  { value: 'userpromptsubmit', label: 'userpromptsubmit', description: 'Prompt submitted' },
  { value: 'precompact', label: 'precompact', description: 'Before compaction' },
];

function extractFilename(audioUrl) {
  const urlParts = audioUrl.split('/');
  return urlParts.find(part => part.endsWith('.ogg')) || 'audio.ogg';
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

// Create a filename-safe suffix from quote text (max ~50 chars)
function createQuoteSuffix(text, maxLength = 50) {
  if (!text) return '';
  const sanitized = text
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/['\u2018\u2019]/g, '')
    .replace(/[.,!;:]+$/g, '')
    .trim();
  if (sanitized.length <= maxLength) return sanitized;
  const truncated = sanitized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;
}

export default function SelectionActionBar() {
  const { selectedCount, selectedArray, clearSelection } = useSelection();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('done');
  const [saveResult, setSaveResult] = useState(null);

  // Clear save result after 3 seconds
  useEffect(() => {
    if (saveResult) {
      const timer = setTimeout(() => setSaveResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveResult]);

  if (selectedCount === 0) return null;

  const prepareQuotes = () => {
    return selectedArray.map(item => {
      const baseName = extractFilename(item.quote.audioUrl).replace('.ogg', '');
      const quoteSuffix = createQuoteSuffix(item.quote.text);
      const filename = quoteSuffix ? `${baseName} - ${quoteSuffix}.mp3` : `${baseName}.mp3`;
      return {
        audioUrl: item.quote.audioUrl,
        filename,
        unitName: sanitizeFilename(item.unitName),
        categoryName: sanitizeFilename(item.categoryName),
      };
    });
  };

  const handleSaveToSounds = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      const quotes = prepareQuotes();
      const response = await fetch('http://localhost:3001/api/save-to-sounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes, folder: selectedFolder }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Save failed');
      }

      setSaveResult({ success: true, saved: result.saved, targetDir: result.targetDir });
      clearSelection();
    } catch (error) {
      console.error('Save error:', error);
      setSaveResult({ success: false, error: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatchDownload = async () => {
    setIsDownloading(true);

    try {
      const quotes = prepareQuotes();

      const response = await fetch('http://localhost:3001/api/download-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes }),
      });

      if (!response.ok) throw new Error('Batch download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sc2-quotes.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      clearSelection();
    } catch (error) {
      console.error('Batch download error:', error);
      alert('Batch download failed. Make sure the backend server is running.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-6 py-3 flex items-center gap-4 z-50">
      <span className="text-gray-300">
        {selectedCount} quote{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <button
        onClick={clearSelection}
        className="text-gray-400 hover:text-white transition-colors"
      >
        Clear
      </button>

      {/* Folder selector and save button */}
      <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1.5 text-sm"
        >
          {SOUND_FOLDERS.map(folder => (
            <option key={folder.value} value={folder.value}>
              {folder.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSaveToSounds}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-wait text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
          title={`Save to ~/.claude/sounds/${selectedFolder}/`}
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              Save to Sounds
            </>
          )}
        </button>
      </div>

      {/* Download ZIP button */}
      <button
        onClick={handleBatchDownload}
        disabled={isDownloading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-wait text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
      >
        {isDownloading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Downloading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download ZIP
          </>
        )}
      </button>

      {/* Save result toast */}
      {saveResult && (
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded text-sm ${
          saveResult.success ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
        }`}>
          {saveResult.success
            ? `Saved ${saveResult.saved} file${saveResult.saved !== 1 ? 's' : ''}`
            : `Error: ${saveResult.error}`
          }
        </div>
      )}
    </div>
  );
}
