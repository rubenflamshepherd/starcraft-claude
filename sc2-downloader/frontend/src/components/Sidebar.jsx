import { useState, useEffect, useMemo } from 'react';
import { buildViewConfig, getFactionStyles } from '../utils/factionStyles';

export default function Sidebar({ sections, selectedUnit, onSelectUnit, selectedView, onViewChange, views, quoteSearchQuery, onQuoteSearchChange, recommendedSetup, selectedGame, games, onGameChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

  const isHomeView = selectedView === 'home';
  const isRecommendedView = selectedView === 'recommended';

  // Build viewConfig dynamically from the selected game's factions
  const viewConfig = useMemo(() => buildViewConfig(selectedGame), [selectedGame]);

  const config = viewConfig[selectedView] || viewConfig[selectedGame.factions[0]?.id] || viewConfig.home;
  const factions = views.filter(v => v !== 'recommended' && v !== 'home');

  useEffect(() => {
    if (isRecommendedView && recommendedSetup?.hooks) {
      setExpandedSections(
        recommendedSetup.hooks.reduce((acc, hook) => ({ ...acc, [hook.name]: true }), {})
      );
    } else {
      setExpandedSections(
        sections.reduce((acc, section) => ({ ...acc, [section.name]: true }), {})
      );
    }
  }, [sections, isRecommendedView, recommendedSetup]);

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const filteredSections = sections.map(section => ({
    ...section,
    units: section.units.filter(unit =>
      unit.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.units.length > 0);

  const hasMultipleGames = games.length > 1;

  return (
    <div className={`w-72 ${config.bgClass} border-r ${config.borderClass} flex flex-col h-screen`}>
      <div className={`p-4 border-b ${config.borderClass}`}>
        <h1 className={`text-lg font-bold ${config.primaryClass} mb-3`}>
          {selectedGame.name} Quotes
        </h1>

        {hasMultipleGames && (
          <select
            value={selectedGame.id}
            onChange={(e) => onGameChange(e.target.value)}
            className={`w-full px-3 py-2 ${config.inputBg} border ${config.inputBorder} rounded text-sm text-gray-200 focus:outline-none ${config.inputFocus} mb-3`}
          >
            {games.map(game => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1 mb-2">
          <button
            onClick={() => onViewChange('home')}
            className={`py-1.5 px-2 text-sm font-medium rounded transition-colors ${
              isHomeView
                ? `${viewConfig.home.selectedBg} ${viewConfig.home.primaryClass}`
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
            title="Home"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          {factions.map((factionId) => {
            const factionConfig = viewConfig[factionId];
            return (
              <button
                key={factionId}
                onClick={() => onViewChange(factionId)}
                className={`flex-1 py-1.5 px-2 text-sm font-medium rounded transition-colors capitalize ${
                  selectedView === factionId
                    ? `${factionConfig?.selectedBg || ''} ${factionConfig?.primaryClass || ''}`
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {factionConfig?.label || factionId}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onViewChange('recommended')}
          className={`w-full py-1.5 px-2 text-sm font-medium rounded transition-colors mb-3 flex items-center justify-center gap-1.5 ${
            isRecommendedView
              ? `${viewConfig.recommended.selectedBg} ${viewConfig.recommended.primaryClass}`
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Recommended Setup
        </button>

        {!isRecommendedView && !isHomeView && (
          <>
            <input
              type="text"
              placeholder="Search units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-2 ${config.inputBg} border ${config.inputBorder} rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none ${config.inputFocus} mb-2`}
            />
            <input
              type="text"
              placeholder="Search quotes..."
              value={quoteSearchQuery}
              onChange={(e) => onQuoteSearchChange(e.target.value)}
              className={`w-full px-3 py-2 ${config.inputBg} border ${config.inputBorder} rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none ${config.inputFocus}`}
            />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isHomeView ? (
          // Home View - Show quick navigation hints
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm mb-2">Select a faction to browse quotes</p>
            <p className="text-xs">or check out the Recommended Setup</p>
          </div>
        ) : isRecommendedView ? (
          // Recommended Setup View - Show hooks
          recommendedSetup?.hooks?.map((hook) => (
            <div key={hook.name} className="mb-2">
              <button
                onClick={() => {
                  toggleSection(hook.name);
                  document.getElementById(`hook-${hook.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-2 w-full text-left py-2 px-2 rounded hover:bg-white/5 transition-colors"
              >
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform ${expandedSections[hook.name] ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polygon points="8,5 19,12 8,19" />
                </svg>
                <span className="text-sm font-semibold text-amber-400">{hook.name}</span>
                <span className="text-xs text-gray-500">({hook.recommendations.length})</span>
              </button>

              {expandedSections[hook.name] && (
                <div className="ml-4">
                  <p className="text-xs text-gray-500 px-2 py-1 mb-1">{hook.description}</p>
                  {hook.recommendations.map((rec, idx) => {
                    const recStyles = getFactionStyles(rec.race);
                    return (
                      <div
                        key={`${hook.name}-${idx}`}
                        className="py-1.5 px-2 text-sm"
                      >
                        <span className={`block truncate ${recStyles.primaryClass}`}>{rec.text}</span>
                        <span className="text-xs text-gray-500">{rec.unit}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        ) : (
          // Regular faction view - Show units
          filteredSections.map((section) => (
            <div key={section.name} className="mb-2">
              <button
                onClick={() => toggleSection(section.name)}
                className="flex items-center gap-2 w-full text-left py-2 px-2 rounded hover:bg-white/5 transition-colors"
              >
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform ${expandedSections[section.name] ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polygon points="8,5 19,12 8,19" />
                </svg>
                <span className="text-sm font-semibold text-gray-300">{section.name}</span>
                <span className="text-xs text-gray-500">({section.units.length})</span>
              </button>

              {expandedSections[section.name] && (
                <div className="ml-4">
                  {section.units.map((unit) => {
                    const unitStyles = unit.race ? getFactionStyles(unit.race) : config;
                    return (
                      <button
                        key={`${section.name}-${unit.name}`}
                        onClick={() => onSelectUnit(unit)}
                        className={`w-full text-left py-1.5 px-2 rounded text-sm transition-colors ${
                          selectedUnit?.name === unit.name
                            ? `${unitStyles.selectedBg} ${unitStyles.primaryClass}`
                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                        }`}
                      >
                        {unit.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className={`p-3 border-t ${config.borderClass} text-xs text-gray-500`}>
        {selectedGame.attribution}
      </div>
    </div>
  );
}
