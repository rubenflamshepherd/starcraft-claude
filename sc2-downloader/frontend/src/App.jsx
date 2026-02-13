import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UnitPanel from './components/UnitPanel';
import HeaderNav from './components/HeaderNav';
import gamesRegistry from './data/games.json';
import initialRecommendedSetup from './data/recommendedSetup.json';
import { getFactionStyles } from './utils/factionStyles';
import {
  migrateToMultiList,
  getActiveList,
  addRecommendation,
  removeRecommendation,
  moveRecommendation,
  reorderRecommendations,
  createList,
  deleteList,
  renameList,
  setActiveList,
} from './utils/listManager';

const STORAGE_KEY = 'sc2-quotes-recommended-setup';
const HOOK_TO_FOLDER = {
  SessionStart: 'start',
  UserPromptSubmit: 'userpromptsubmit',
  Stop: 'done',
  PreCompact: 'precompact',
  PermissionPrompt: 'permission',
  Question: 'question',
};

function getInitialListsState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return migrateToMultiList(JSON.parse(saved), initialRecommendedSetup);
    } catch {
      return migrateToMultiList(initialRecommendedSetup, initialRecommendedSetup);
    }
  }
  return migrateToMultiList(initialRecommendedSetup, initialRecommendedSetup);
}

// Map of lazy-loading functions for each game's data file
const gameDataLoaders = {
  sc2: () => import('./data/games/sc2.json'),
  wc2: () => import('./data/games/wc2.json'),
  aoe3: () => import('./data/games/aoe3.json'),
};

function App() {
  const [selectedGame, setSelectedGame] = useState(gamesRegistry.games[0]);
  const [gameData, setGameData] = useState(null);
  const [selectedView, setSelectedView] = useState('home');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [listsState, setListsState] = useState(getInitialListsState);
  const [isSyncingToClaude, setIsSyncingToClaude] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const activeList = getActiveList(listsState);
  // Derive recommendedSetup from activeList for backward compatibility with child components
  const recommendedSetup = activeList;

  // Build faction list from selected game
  const factions = selectedGame.factions.map(f => f.id);
  const VIEWS = ['home', 'all', ...factions, 'recommended'];

  // Lazy-load game data when selected game changes
  useEffect(() => {
    let cancelled = false;

    const loader = gameDataLoaders[selectedGame.id];
    if (loader) {
      loader().then(mod => {
        if (!cancelled) {
          setGameData(mod.default || mod);
        }
      });
    }

    return () => { cancelled = true; };
  }, [selectedGame.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listsState));
  }, [listsState]);

  const handleRemoveRecommendation = (hookName, audioUrl) => {
    setListsState(prev => removeRecommendation(prev, hookName, audioUrl));
  };

  const handleMoveRecommendation = (fromHookName, toHookName, recommendation) => {
    setListsState(prev => moveRecommendation(prev, fromHookName, toHookName, recommendation));
  };

  const handleReorderRecommendations = (hookName, oldIndex, newIndex) => {
    setListsState(prev => reorderRecommendations(prev, hookName, oldIndex, newIndex));
  };

  const handleAddRecommendation = (hookName, recommendation) => {
    setListsState(prev => addRecommendation(prev, hookName, recommendation));
  };

  const handleImportSetup = (newSetup) => {
    // Import replaces the active list's hooks (backward compatible format: { hooks: [...] })
    setListsState(prev => ({
      ...prev,
      lists: prev.lists.map(list =>
        list.id === getActiveList(prev).id
          ? { ...list, hooks: newSetup.hooks }
          : list
      ),
    }));
  };

  const handleCreateList = (name) => {
    setListsState(prev => createList(prev, name));
  };

  const handleDeleteList = (listId) => {
    setListsState(prev => deleteList(prev, listId));
  };

  const handleRenameList = (listId, newName) => {
    setListsState(prev => renameList(prev, listId, newName));
  };

  const handleSetActiveList = (listId) => {
    setListsState(prev => setActiveList(prev, listId));
  };

  const handleGameChange = (gameId) => {
    const game = gamesRegistry.games.find(g => g.id === gameId);
    if (game) {
      setSelectedGame(game);
      setGameData(null);
      setSelectedView('home');
      setSelectedUnit(null);
      setQuoteSearchQuery('');
    }
  };

  const handleSyncToClaude = async () => {
    if (!recommendedSetup?.hooks) return;

    setIsSyncingToClaude(true);
    setSyncResult(null);

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
        throw new Error(result.error || 'Sync failed');
      }

      setSyncResult({
        success: true,
        saved: result.saved,
        skipped: result.skipped,
      });
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error) {
      setSyncResult({
        success: false,
        error: error.message,
      });
      setTimeout(() => setSyncResult(null), 4000);
    } finally {
      setIsSyncingToClaude(false);
    }
  };

  const isHomeView = selectedView === 'home';
  const isRecommendedView = selectedView === 'recommended';
  const selectedFaction = (isRecommendedView || isHomeView) ? 'all' : selectedView;

  const currentSections = (isRecommendedView || isHomeView || !gameData)
    ? []
    : selectedFaction === 'all'
      ? Object.entries(gameData.factions).flatMap(([factionId, data]) =>
          data.sections.map(section => ({
            ...section,
            name: `${factionId.charAt(0).toUpperCase() + factionId.slice(1)} - ${section.name}`,
            race: factionId,
            units: section.units.map(unit => ({ ...unit, race: factionId }))
          }))
        )
      : (gameData.factions[selectedFaction]?.sections || []).map(section => ({
          ...section,
          units: section.units.map(unit => ({ ...unit, race: selectedFaction }))
        }));

  const handleViewChange = (view) => {
    setSelectedView(view);
    setSelectedUnit(null);
    setQuoteSearchQuery('');
  };

  const getBgClass = () => {
    if (isRecommendedView || isHomeView || selectedFaction === 'all') return 'bg-gray-950';
    return getFactionStyles(selectedFaction).darkerBgClass;
  };

  return (
    <div className={`flex h-screen flex-col ${getBgClass()}`}>
      <HeaderNav
        selectedGame={selectedGame}
        games={gamesRegistry.games}
        onGameChange={handleGameChange}
        lists={listsState.lists}
        activeListId={listsState.activeListId}
        onSetActiveList={handleSetActiveList}
        onSyncToClaude={handleSyncToClaude}
        isSyncing={isSyncingToClaude}
        syncResult={syncResult}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          sections={currentSections}
          selectedUnit={selectedUnit}
          onSelectUnit={setSelectedUnit}
          selectedView={selectedView}
          onViewChange={handleViewChange}
          views={VIEWS}
          quoteSearchQuery={quoteSearchQuery}
          onQuoteSearchChange={setQuoteSearchQuery}
          recommendedSetup={recommendedSetup}
          lists={listsState.lists}
          activeListId={listsState.activeListId}
          selectedGame={selectedGame}
        />
        <UnitPanel
          unit={selectedUnit}
          race={selectedFaction}
          sections={currentSections}
          quoteSearchQuery={quoteSearchQuery}
          isHomeView={isHomeView}
          isRecommendedView={isRecommendedView}
          recommendedSetup={recommendedSetup}
          onRemoveRecommendation={handleRemoveRecommendation}
          onMoveRecommendation={handleMoveRecommendation}
          onReorderRecommendations={handleReorderRecommendations}
          onAddRecommendation={handleAddRecommendation}
          onImportSetup={handleImportSetup}
          onNavigate={handleViewChange}
          selectedGame={selectedGame}
          lists={listsState.lists}
          activeListId={listsState.activeListId}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
          onRenameList={handleRenameList}
        />
      </div>
    </div>
  );
}

export default App;
