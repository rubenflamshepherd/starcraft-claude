import { useState, useMemo } from 'react';
import { buildViewConfig, getFactionStyles } from '../utils/factionStyles';
import CustomSelect from './CustomSelect';

export default function Sidebar({ sections, selectedUnit, onSelectUnit, selectedView, onViewChange, views, quoteSearchQuery, onQuoteSearchChange, selectedGame, games, onGameChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

  const isHomeView = selectedView === 'home';
  const isRecommendedView = selectedView === 'recommended';

  const viewConfig = useMemo(() => buildViewConfig(selectedGame), [selectedGame]);
  const config = viewConfig[selectedView] || viewConfig[selectedGame.factions[0]?.id] || viewConfig.home;
  const factions = views.filter(v => v !== 'recommended' && v !== 'home');
  const hasMultipleGames = games.length > 1;

  // Compute a key representing the current sections/view to detect when to reset
  const expandedKey = sections.map(s => s.name).join(',');
  const [prevExpandedKey, setPrevExpandedKey] = useState(expandedKey);

  if (expandedKey !== prevExpandedKey) {
    setPrevExpandedKey(expandedKey);
    setExpandedSections(
      sections.reduce((acc, section) => ({ ...acc, [section.name]: true }), {})
    );
  }

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

  return (
    <div className={`w-72 ${config.bgClass} border-r ${config.borderClass} flex h-full flex-col`}>
      <div className={`p-4 border-b ${config.borderClass}`}>
        <h1 className={`text-base font-bold ${config.primaryClass} mb-3`}>
          Browse Quotes
        </h1>

        {hasMultipleGames && (
          <CustomSelect
            value={selectedGame.id}
            onChange={onGameChange}
            options={games.map((game) => ({ value: game.id, label: game.name }))}
            buttonClassName={`px-3 py-2 text-sm mb-3 ${config.inputFocus}`}
          />
        )}

        <div className="flex gap-1 mb-2">
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
          <div />
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
