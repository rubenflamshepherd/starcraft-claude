import { useState, useEffect, useMemo } from 'react';
import gamesRegistry from '../data/games.json';
import initialRecommendedSetup from '../data/recommendedSetup.json';
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
} from '../utils/listManager';

const STORAGE_KEY = 'sc2-quotes-recommended-setup';

const gameDataLoaders = {
  sc2: () => import('../data/games/sc2.json'),
  wc2: () => import('../data/games/wc2.json'),
  aoe3: () => import('../data/games/aoe3.json'),
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

export function useQuotesAppState() {
  const [selectedGame, setSelectedGame] = useState(gamesRegistry.games[0]);
  const [gameData, setGameData] = useState(null);
  const [selectedView, setSelectedView] = useState('home');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [listsState, setListsState] = useState(getInitialListsState);

  const activeList = useMemo(() => getActiveList(listsState), [listsState]);
  const recommendedSetup = activeList;

  const factions = selectedGame.factions.map((f) => f.id);
  const views = ['home', 'all', ...factions, 'recommended'];

  useEffect(() => {
    let cancelled = false;
    const loader = gameDataLoaders[selectedGame.id];

    if (loader) {
      loader().then((mod) => {
        if (!cancelled) {
          setGameData(mod.default || mod);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedGame.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listsState));
  }, [listsState]);

  const handleRemoveRecommendation = (hookName, audioUrl) => {
    setListsState((prev) => removeRecommendation(prev, hookName, audioUrl));
  };

  const handleMoveRecommendation = (fromHookName, toHookName, recommendation) => {
    setListsState((prev) => moveRecommendation(prev, fromHookName, toHookName, recommendation));
  };

  const handleReorderRecommendations = (hookName, oldIndex, newIndex) => {
    setListsState((prev) => reorderRecommendations(prev, hookName, oldIndex, newIndex));
  };

  const handleAddRecommendation = (hookName, recommendation) => {
    setListsState((prev) => addRecommendation(prev, hookName, recommendation));
  };

  const handleImportSetup = (newSetup) => {
    setListsState((prev) => ({
      ...prev,
      lists: prev.lists.map((list) =>
        list.id === getActiveList(prev).id
          ? { ...list, hooks: newSetup.hooks }
          : list
      ),
    }));
  };

  const handleCreateList = (name) => {
    setListsState((prev) => createList(prev, name));
  };

  const handleDeleteList = (listId) => {
    setListsState((prev) => deleteList(prev, listId));
  };

  const handleRenameList = (listId, newName) => {
    setListsState((prev) => renameList(prev, listId, newName));
  };

  const handleSetActiveList = (listId) => {
    setListsState((prev) => setActiveList(prev, listId));
  };

  const handleGameChange = (gameId) => {
    const game = gamesRegistry.games.find((g) => g.id === gameId);
    if (game) {
      setSelectedGame(game);
      setGameData(null);
      setSelectedView('home');
      setSelectedUnit(null);
      setQuoteSearchQuery('');
    }
  };

  const handleViewChange = (view) => {
    setSelectedView(view);
    setSelectedUnit(null);
    setQuoteSearchQuery('');
  };

  const isHomeView = selectedView === 'home';
  const isRecommendedView = selectedView === 'recommended';
  const selectedFaction = (isRecommendedView || isHomeView) ? 'all' : selectedView;

  const currentSections = (isRecommendedView || isHomeView || !gameData)
    ? []
    : selectedFaction === 'all'
      ? Object.entries(gameData.factions).flatMap(([factionId, data]) =>
          data.sections.map((section) => ({
            ...section,
            name: `${factionId.charAt(0).toUpperCase() + factionId.slice(1)} - ${section.name}`,
            race: factionId,
            units: section.units.map((unit) => ({ ...unit, race: factionId })),
          }))
        )
      : (gameData.factions[selectedFaction]?.sections || []).map((section) => ({
          ...section,
          units: section.units.map((unit) => ({ ...unit, race: selectedFaction })),
        }));

  return {
    selectedGame,
    selectedView,
    selectedUnit,
    quoteSearchQuery,
    listsState,
    views,
    currentSections,
    isHomeView,
    isRecommendedView,
    selectedFaction,
    recommendedSetup,
    games: gamesRegistry.games,
    setSelectedUnit,
    setQuoteSearchQuery,
    handleViewChange,
    handleGameChange,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handleMoveRecommendation,
    handleReorderRecommendations,
    handleImportSetup,
    handleCreateList,
    handleDeleteList,
    handleRenameList,
    handleSetActiveList,
  };
}
