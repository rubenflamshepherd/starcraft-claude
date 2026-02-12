import { useState } from 'react';
import QuoteCategory from './QuoteCategory';
import QuoteSearchResults from './QuoteSearchResults';
import SelectionActionBar from './SelectionActionBar';
import QuoteLine from './QuoteLine';
import LandingPage from './LandingPage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getFactionStyles } from '../utils/factionStyles';

const HOOK_TO_FOLDER = {
  SessionStart: 'start',
  UserPromptSubmit: 'userpromptsubmit',
  Stop: 'done',
  PreCompact: 'precompact',
  PermissionPrompt: 'permission',
  Question: 'question',
};

function SortableRecommendation({ rec, idx, hook, hookNames, onMoveRecommendation, onRemoveRecommendation }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rec.audioUrl });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border-b border-gray-700/20 last:border-b-0 group/rec">
      <div className="flex items-center gap-2 px-3 pt-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className={`text-xs px-2 py-0.5 rounded ${getFactionStyles(rec.race).badgeBg} ${getFactionStyles(rec.race).primaryClass}`}>
          {rec.unit}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/rec:opacity-100 transition-opacity">
          {hookNames.filter(name => name !== hook.name).map(targetHook => (
            <button
              key={targetHook}
              onClick={() => onMoveRecommendation?.(hook.name, targetHook, rec)}
              className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition-colors"
              title={`Move to ${targetHook}`}
            >
              {targetHook}
            </button>
          ))}
          <button
            onClick={() => onRemoveRecommendation?.(hook.name, rec.audioUrl)}
            className="p-1 rounded hover:bg-red-500/20"
            title="Remove from recommendations"
          >
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <QuoteLine
        quote={{ text: rec.text, audioUrl: rec.audioUrl }}
        race={rec.race}
        unitName={rec.unit}
        categoryName={hook.name}
      />
    </div>
  );
}

export default function UnitPanel({ unit, race = 'protoss', sections = [], quoteSearchQuery = '', isHomeView = false, isRecommendedView = false, recommendedSetup = null, onRemoveRecommendation = null, onMoveRecommendation = null, onReorderRecommendations = null, onAddRecommendation = null, onImportSetup = null, onNavigate = null, selectedGame = null }) {
  // Use unit's race for styling when available (for "all" tab), otherwise use selected race
  const effectiveRace = unit?.race || race;
  const primaryClass = getFactionStyles(effectiveRace).primaryClass;

  // Drag and drop sensors (must be at top level)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Download all state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Save to .claude state
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const handleDownloadAll = async () => {
    if (!recommendedSetup?.hooks) return;

    setIsDownloading(true);
    const zip = new JSZip();

    // Count total files
    const totalFiles = recommendedSetup.hooks.reduce((sum, hook) => sum + hook.recommendations.length, 0);
    setDownloadProgress({ current: 0, total: totalFiles });

    let currentFile = 0;

    for (const hook of recommendedSetup.hooks) {
      const folderName = HOOK_TO_FOLDER[hook.name] || hook.name.toLowerCase();
      const folder = zip.folder(folderName);

      for (const rec of hook.recommendations) {
        try {
          // Extract filename from URL
          const urlMatch = rec.audioUrl.match(/\/([^\/]+)\.ogg\//);
          const baseFilename = urlMatch ? urlMatch[1] : `audio_${currentFile}`;
          const filename = `${baseFilename} - ${rec.text.replace(/[\/\\:*?"<>|]/g, '')}.mp3`;

          // Fetch via download API
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

    // Generate and download zip
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'sc2-claude-sounds.zip');

    setIsDownloading(false);
    setDownloadProgress({ current: 0, total: 0 });
  };

  const handleSaveToSounds = async () => {
    if (!recommendedSetup?.hooks) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      // Prepare all quotes grouped by hook/folder
      const allQuotes = [];
      for (const hook of recommendedSetup.hooks) {
        const folderName = HOOK_TO_FOLDER[hook.name] || hook.name.toLowerCase();
        for (const rec of hook.recommendations) {
          const urlMatch = rec.audioUrl.match(/\/([^\/]+)\.ogg\//);
          const baseFilename = urlMatch ? urlMatch[1] : `audio_${allQuotes.length}`;
          const filename = `${baseFilename} - ${rec.text.replace(/[\/\\:*?"<>|]/g, '')}.mp3`;
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

      setSaveResult({
        success: true,
        saved: result.saved,
        skipped: result.skipped,
        deleted: result.deleted
      });
      setTimeout(() => setSaveResult(null), 5000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveResult({ success: false, error: error.message });
      setTimeout(() => setSaveResult(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSetup = () => {
    const json = JSON.stringify(recommendedSetup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recommendedSetup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        } else {
          alert('Invalid setup file format');
        }
      } catch (error) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Show search results when there's a quote search query
  if (quoteSearchQuery) {
    return (
      <>
        <QuoteSearchResults sections={sections} searchQuery={quoteSearchQuery} race={race} />
        <SelectionActionBar />
      </>
    );
  }

  // Home View - Landing Page
  if (isHomeView) {
    return <LandingPage onNavigate={onNavigate} />;
  }

  // Recommended Setup View
  if (isRecommendedView) {
    const hooks = recommendedSetup?.hooks || [];
    const hookNames = hooks.map(h => h.name);
    const leftColumnHooks = hooks.filter((_, idx) => idx % 2 === 0);
    const rightColumnHooks = hooks.filter((_, idx) => idx % 2 === 1);

    const handleDragEnd = (hookName) => (event) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const hook = hooks.find(h => h.name === hookName);
        const oldIndex = hook.recommendations.findIndex(r => r.audioUrl === active.id);
        const newIndex = hook.recommendations.findIndex(r => r.audioUrl === over.id);
        onReorderRecommendations?.(hookName, oldIndex, newIndex);
      }
    };

    const renderHook = (hook) => (
      <div key={hook.name} id={`hook-${hook.name}`} className="mb-8">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-amber-400">{hook.name}</h2>
          <p className="text-sm text-gray-500">{hook.description}</p>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(hook.name)}>
          <SortableContext items={hook.recommendations.map(r => r.audioUrl)} strategy={verticalListSortingStrategy}>
            <div className="bg-gray-900/50 rounded-lg border border-gray-700/30">
              {hook.recommendations.map((rec, idx) => (
                <SortableRecommendation
                  key={rec.audioUrl}
                  rec={rec}
                  idx={idx}
                  hook={hook}
                  hookNames={hookNames}
                  onMoveRecommendation={onMoveRecommendation}
                  onRemoveRecommendation={onRemoveRecommendation}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );

    return (
      <>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-amber-400 mb-2">Recommended Setup</h1>
              <p className="text-gray-400 text-sm">
                Curated SC2 quotes that work well with Claude Code hooks. Click to preview, download to use.
              </p>
            </div>
            <div className="flex items-center gap-2 relative">
              <button
                onClick={handleSaveToSounds}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Save directly to ~/.claude/sounds/"
              >
                {isSaving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                    <span>Sync to .claude</span>
                  </>
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
                  title="More options"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {showSettingsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                      <button
                        onClick={() => { handleDownloadAll(); setShowSettingsMenu(false); }}
                        disabled={isDownloading}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {isDownloading ? `Downloading ${downloadProgress.current}/${downloadProgress.total}` : 'Download ZIP'}
                      </button>
                      <button
                        onClick={() => { handleExportSetup(); setShowSettingsMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Setup JSON
                      </button>
                      <label className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import Setup JSON
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => { handleImportSetup(e); setShowSettingsMenu(false); }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>
              {saveResult && (
                <div className={`absolute -bottom-10 right-0 px-3 py-1.5 rounded text-sm whitespace-nowrap ${
                  saveResult.success ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
                }`}>
                  {saveResult.success
                    ? `Synced: ${saveResult.saved} new, ${saveResult.skipped} existing, ${saveResult.deleted} removed`
                    : `Error: ${saveResult.error}`
                  }
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              {leftColumnHooks.map(renderHook)}
            </div>
            <div>
              {rightColumnHooks.map(renderHook)}
            </div>
          </div>
        </div>
        <SelectionActionBar />
      </>
    );
  }

  if (!unit) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p>Select a unit to view quotations</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className={`text-2xl font-bold ${primaryClass} mb-6`}>{unit.name}</h1>

        {unit.categories.map((category, index) => (
          <QuoteCategory
            key={index}
            category={category}
            race={effectiveRace}
            unitName={unit.name}
            recommendedSetup={recommendedSetup}
            onAddRecommendation={onAddRecommendation}
            game={selectedGame?.id}
          />
        ))}
      </div>
      <SelectionActionBar />
    </>
  );
}
