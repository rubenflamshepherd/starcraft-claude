import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UnitPanel from './components/UnitPanel';
import quotations from './data/quotations.json';
import initialRecommendedSetup from './data/recommendedSetup.json';

const RACES = ['all', 'protoss', 'terran', 'zerg'];
const VIEWS = ['home', ...RACES, 'recommended'];

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

function App() {
  const [selectedView, setSelectedView] = useState('home');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [recommendedSetup, setRecommendedSetup] = useState(getInitialRecommendedSetup);

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

  const isHomeView = selectedView === 'home';
  const isRecommendedView = selectedView === 'recommended';
  const selectedRace = (isRecommendedView || isHomeView) ? 'all' : selectedView;

  const currentSections = (isRecommendedView || isHomeView)
    ? []
    : selectedRace === 'all'
      ? Object.entries(quotations.races).flatMap(([race, data]) =>
          data.sections.map(section => ({
            ...section,
            name: `${race.charAt(0).toUpperCase() + race.slice(1)} - ${section.name}`,
            race,
            units: section.units.map(unit => ({ ...unit, race }))
          }))
        )
      : (quotations.races[selectedRace]?.sections || []).map(section => ({
          ...section,
          units: section.units.map(unit => ({ ...unit, race: selectedRace }))
        }));

  const handleViewChange = (view) => {
    setSelectedView(view);
    setSelectedUnit(null);
    setQuoteSearchQuery('');
  };

  const bgClass = (isRecommendedView || isHomeView)
    ? 'bg-gray-950'
    : selectedRace === 'all'
      ? 'bg-gray-950'
      : selectedRace === 'terran'
        ? 'bg-terran-darker'
        : selectedRace === 'zerg'
          ? 'bg-zerg-darker'
          : 'bg-protoss-darker';

  return (
    <div className={`flex h-screen ${bgClass}`}>
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
      />
      <UnitPanel
        unit={selectedUnit}
        race={selectedRace}
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
      />
    </div>
  );
}

export default App;
