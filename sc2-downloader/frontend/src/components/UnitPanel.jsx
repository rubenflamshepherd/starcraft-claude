import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import LandingPage from './LandingPage';
import SelectionActionBar from './SelectionActionBar';
import RecommendedHooksPanel from './recommended/RecommendedHooksPanel';
import SetupActionsPanel from './recommended/SetupActionsPanel';
import UnitQuotesPanel from './units/UnitQuotesPanel';
import QuoteResultsPanel from './quotes/QuoteResultsPanel';
import { useNotifications } from '../contexts/NotificationContext';

const HOOK_TO_FOLDER = {
  SessionStart: 'start',
  UserPromptSubmit: 'userpromptsubmit',
  Stop: 'done',
  PreCompact: 'precompact',
  PermissionPrompt: 'permission',
  Question: 'question',
};

export default function UnitPanel({
  unit,
  race = 'protoss',
  sections = [],
  quoteSearchQuery = '',
  isHomeView = false,
  isRecommendedView = false,
  recommendedSetup = null,
  onRemoveRecommendation = null,
  onMoveRecommendation = null,
  onReorderRecommendations = null,
  onAddRecommendation = null,
  onImportSetup = null,
  onNavigate = null,
  selectedGame = null,
  lists = [],
  activeListId = 'default',
  onCreateList = null,
  onDeleteList = null,
  onRenameList = null,
  onSetActiveList = null,
}) {
  const { pushNotification } = useNotifications();

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const handleDownloadAll = async () => {
    if (!recommendedSetup?.hooks) return;

    setIsDownloading(true);
    const zip = new JSZip();

    const totalFiles = recommendedSetup.hooks.reduce((sum, hook) => sum + hook.recommendations.length, 0);
    setDownloadProgress({ current: 0, total: totalFiles });

    let currentFile = 0;

    for (const hook of recommendedSetup.hooks) {
      const folderName = HOOK_TO_FOLDER[hook.name] || hook.name.toLowerCase();
      const folder = zip.folder(folderName);

      for (const rec of hook.recommendations) {
        try {
          const urlMatch = rec.audioUrl.match(/\/([^/]+)\.ogg\//);
          const baseFilename = urlMatch ? urlMatch[1] : `audio_${currentFile}`;
          const filename = `${baseFilename} - ${rec.text.replace(/[/\\:*?"<>|]/g, '')}.mp3`;

          const downloadUrl = `http://localhost:3001/api/download?url=${encodeURIComponent(rec.audioUrl)}&filename=${encodeURIComponent(filename)}`;
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          folder.file(filename, blob);
        } catch (error) {
          console.error(`Failed to download ${rec.text}:`, error);
        }

        currentFile++;
        setDownloadProgress({ current: currentFile, total: totalFiles });
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'sc2-claude-sounds.zip');

    setIsDownloading(false);
    setDownloadProgress({ current: 0, total: 0 });
    pushNotification('Setup ZIP downloaded.', 'success');
  };

  const handleSaveToSounds = async () => {
    if (!recommendedSetup?.hooks) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      const allQuotes = [];
      for (const hook of recommendedSetup.hooks) {
        const folderName = HOOK_TO_FOLDER[hook.name] || hook.name.toLowerCase();
        for (const rec of hook.recommendations) {
          const urlMatch = rec.audioUrl.match(/\/([^/]+)\.ogg\//);
          const baseFilename = urlMatch ? urlMatch[1] : `audio_${allQuotes.length}`;
          const filename = `${baseFilename} - ${rec.text.replace(/[/\\:*?"<>|]/g, '')}.mp3`;
          allQuotes.push({
            audioUrl: rec.audioUrl,
            filename,
            folder: folderName,
          });
        }
      }

      const response = await fetch('http://localhost:3001/api/save-to-sounds-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes: allQuotes }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Save failed');
      }

      setSaveResult({ success: true, saved: result.saved, skipped: result.skipped, deleted: result.deleted });
      setTimeout(() => setSaveResult(null), 5000);
      pushNotification(`Synced ${result.saved} new sound files.`, 'success');
    } catch (error) {
      console.error('Save error:', error);
      setSaveResult({ success: false, error: error.message });
      pushNotification(`Sync failed: ${error.message}`, 'error');
      setTimeout(() => setSaveResult(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSetup = () => {
    const exportData = { hooks: recommendedSetup?.hooks || [] };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'recommendedSetup.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    pushNotification('Setup exported.', 'success');
  };

  const handleImportSetup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported?.hooks && Array.isArray(imported.hooks)) {
          onImportSetup?.(imported);
          pushNotification('Setup imported.', 'success');
        } else {
          pushNotification('Invalid setup file format.', 'error');
        }
      } catch {
        pushNotification('Failed to parse JSON file.', 'error');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  if (quoteSearchQuery) {
    return (
      <>
        <QuoteResultsPanel sections={sections} searchQuery={quoteSearchQuery} race={race} />
        <SelectionActionBar />
      </>
    );
  }

  if (isHomeView) {
    return <LandingPage onNavigate={onNavigate} />;
  }

  if (isRecommendedView) {
    const hooks = recommendedSetup?.hooks || [];

    return (
      <>
        <div className="h-full overflow-y-auto px-5 py-5 md:px-6">
          <SetupActionsPanel
            lists={lists}
            activeListId={activeListId}
            hooks={hooks}
            isSaving={isSaving}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            saveResult={saveResult}
            onSetActiveList={onSetActiveList}
            onCreateList={onCreateList}
            onRenameList={onRenameList}
            onDeleteList={onDeleteList}
            onSaveToSounds={handleSaveToSounds}
            onDownloadAll={handleDownloadAll}
            onExportSetup={handleExportSetup}
            onImportSetup={handleImportSetup}
          />

          <RecommendedHooksPanel
            hooks={hooks}
            onMoveRecommendation={onMoveRecommendation}
            onRemoveRecommendation={onRemoveRecommendation}
            onReorderRecommendations={onReorderRecommendations}
          />
        </div>
        <SelectionActionBar />
      </>
    );
  }

  return (
    <>
      <UnitQuotesPanel
        unit={unit}
        race={race}
        recommendedSetup={recommendedSetup}
        onAddRecommendation={onAddRecommendation}
        selectedGame={selectedGame}
      />
      <SelectionActionBar />
    </>
  );
}
