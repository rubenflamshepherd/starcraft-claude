import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UnitPanel from './components/UnitPanel';
import gamesRegistry from './data/games.json';
import initialRecommendedSetup from './data/recommendedSetup.json';
import { getFactionStyles } from './utils/factionStyles';

const STORAGE_KEY = 'sc2-quotes-recommended-setup';

function getInitialRecommendedSetup() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return initialRecommendedSetup;
    }
  }
  return initialRecommendedSetup;
}

// Map of lazy-loading functions for each game's data file
const gameDataLoaders = {
  sc2: () => import('./data/games/sc2.json'),
};

function App() {
  const [selectedGame, setSelectedGame] = useState(gamesRegistry.games[0]);
  const [gameData, setGameData] = useState(null);
  const [selectedView, setSelectedView] = useState('home');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [recommendedSetup, setRecommendedSetup] = useState(getInitialRecommendedSetup);

  // Build faction list from selected game
  const factions = selectedGame.factions.map(f => f.id);
  const VIEWS = ['home', 'all', ...factions, 'recommended'];

  // Lazy-load game data when selected game changes
  useEffect(() => {
    let cancelled = false;
    setGameData(null);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recommendedSetup));
  }, [recommendedSetup]);

  const handleRemoveRecommendation = (hookName, audioUrl) => {
    setRecommendedSetup(prev => ({
      ...prev,
      hooks: prev.hooks.map(hook =>
        hook.name === hookName
          ? { ...hook, recommendations: hook.recommendations.filter(rec => rec.audioUrl !== audioUrl) }
          : hook
      )
    }));
  };

  const handleMoveRecommendation = (fromHookName, toHookName, recommendation) => {
    setRecommendedSetup(prev => ({
      ...prev,
      hooks: prev.hooks.map(hook => {
        if (hook.name === fromHookName) {
          // Remove from source hook
          return { ...hook, recommendations: hook.recommendations.filter(rec => rec.audioUrl !== recommendation.audioUrl) };
        }
        if (hook.name === toHookName) {
          // Add to target hook (avoid duplicates)
          const exists = hook.recommendations.some(rec => rec.audioUrl === recommendation.audioUrl);
          if (exists) return hook;
          return { ...hook, recommendations: [...hook.recommendations, recommendation] };
        }
        return hook;
      })
    }));
  };

  const handleReorderRecommendations = (hookName, oldIndex, newIndex) => {
    setRecommendedSetup(prev => ({
      ...prev,
      hooks: prev.hooks.map(hook => {
        if (hook.name !== hookName) return hook;
        const newRecs = [...hook.recommendations];
        const [removed] = newRecs.splice(oldIndex, 1);
        newRecs.splice(newIndex, 0, removed);
        return { ...hook, recommendations: newRecs };
      })
    }));
  };

  const handleAddRecommendation = (hookName, recommendation) => {
    setRecommendedSetup(prev => ({
      ...prev,
      hooks: prev.hooks.map(hook => {
        if (hook.name !== hookName) return hook;
        // Avoid duplicates
        const exists = hook.recommendations.some(rec => rec.audioUrl === recommendation.audioUrl);
        if (exists) return hook;
        return { ...hook, recommendations: [...hook.recommendations, recommendation] };
      })
    }));
  };

  const handleImportSetup = (newSetup) => {
    setRecommendedSetup(newSetup);
  };

  const handleGameChange = (gameId) => {
    const game = gamesRegistry.games.find(g => g.id === gameId);
    if (game) {
      setSelectedGame(game);
      setSelectedView('home');
      setSelectedUnit(null);
      setQuoteSearchQuery('');
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
    <div className={`flex h-screen ${getBgClass()}`}>
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
        selectedGame={selectedGame}
        games={gamesRegistry.games}
        onGameChange={handleGameChange}
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
      />
    </div>
  );
}

export default App;
