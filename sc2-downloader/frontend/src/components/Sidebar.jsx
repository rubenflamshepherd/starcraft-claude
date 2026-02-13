import { useMemo, useState } from 'react';
import { buildViewConfig, getFactionStyles } from '../utils/factionStyles';

function Chevron({ expanded }) {
  return (
    <svg
      className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

export default function Sidebar({
  sections,
  selectedUnit,
  onSelectUnit,
  selectedView,
  onViewChange,
  quoteSearchQuery,
  onQuoteSearchChange,
  recommendedSetup,
  selectedGame,
  games,
  onGameChange,
  lists,
  activeListId,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const isHomeView = selectedView === 'home';
  const isRecommendedView = selectedView === 'recommended';
  const viewConfig = useMemo(() => buildViewConfig(selectedGame), [selectedGame]);
  const config = viewConfig[selectedView] || viewConfig[selectedGame.factions[0]?.id] || viewConfig.home;
  const factions = selectedGame.factions.map((faction) => faction.id);

  const expandedKey = isRecommendedView
    ? `rec-${recommendedSetup?.hooks?.map((hook) => hook.name).join(',')}`
    : sections.map((section) => section.name).join(',');

  const createInitialExpandedSections = () => {
    if (isRecommendedView && recommendedSetup?.hooks) {
      return recommendedSetup.hooks.reduce((acc, hook) => ({ ...acc, [hook.name]: true }), {});
    }
    return sections.reduce((acc, section) => ({ ...acc, [section.name]: true }), {});
  };

  const [expandedState, setExpandedState] = useState(() => ({
    key: expandedKey,
    sections: createInitialExpandedSections(),
  }));

  const expandedSections = expandedState.key === expandedKey
    ? expandedState.sections
    : createInitialExpandedSections();

  const toggleSection = (sectionName) => {
    setExpandedState((prev) => {
      const sectionsToUse = prev.key === expandedKey ? prev.sections : createInitialExpandedSections();
      return {
        key: expandedKey,
        sections: {
          ...sectionsToUse,
          [sectionName]: !sectionsToUse[sectionName],
        },
      };
    });
  };

  const filteredSections = sections
    .map((section) => ({
      ...section,
      units: section.units.filter((unit) => unit.name.toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((section) => section.units.length > 0);

  const hasMultipleGames = games.length > 1;

  return (
    <aside className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <h2 className={`mb-3 text-base font-semibold ${config.primaryClass}`}>Navigation</h2>

        {hasMultipleGames ? (
          <select
            value={selectedGame.id}
            onChange={(e) => onGameChange(e.target.value)}
            className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm text-slate-200 ${config.inputBg} ${config.inputBorder} ${config.inputFocus} focus:outline-none`}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        ) : null}

        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onViewChange('home')}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              isHomeView ? `${viewConfig.home.selectedBg} ${viewConfig.home.primaryClass}` : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onViewChange('recommended')}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              isRecommendedView
                ? `${viewConfig.recommended.selectedBg} ${viewConfig.recommended.primaryClass}`
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {lists?.find((list) => list.id === activeListId)?.name || 'Setup'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {factions.map((factionId) => {
            const factionConfig = viewConfig[factionId];
            return (
              <button
                key={factionId}
                type="button"
                onClick={() => onViewChange(factionId)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  selectedView === factionId
                    ? `${factionConfig?.selectedBg || ''} ${factionConfig?.primaryClass || ''}`
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {factionConfig?.label || factionId}
              </button>
            );
          })}
        </div>

        {!isRecommendedView && !isHomeView ? (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Search units"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-100 placeholder-slate-500 ${config.inputBg} ${config.inputBorder} ${config.inputFocus} focus:outline-none`}
            />
            <input
              type="text"
              placeholder="Search quotes"
              value={quoteSearchQuery}
              onChange={(e) => onQuoteSearchChange(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-100 placeholder-slate-500 ${config.inputBg} ${config.inputBorder} ${config.inputFocus} focus:outline-none`}
            />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isHomeView ? (
          <div className="surface-panel rounded-xl p-4 text-sm text-slate-400">
            Pick a faction to browse quotes, or open your setup list.
          </div>
        ) : null}

        {isRecommendedView
          ? recommendedSetup?.hooks?.map((hook) => (
              <div key={hook.name} className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    toggleSection(hook.name);
                    document.getElementById(`hook-${hook.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                >
                  <Chevron expanded={expandedSections[hook.name]} />
                  <span className="text-sm font-semibold text-amber-400">{hook.name}</span>
                  <span className="text-xs text-slate-500">({hook.recommendations.length})</span>
                </button>
                {expandedSections[hook.name] ? (
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
                    <p className="py-1 text-xs text-slate-500">{hook.description}</p>
                    {hook.recommendations.map((rec, idx) => {
                      const recStyles = getFactionStyles(rec.race);
                      return (
                        <div key={`${hook.name}-${idx}`} className="py-1 text-xs">
                          <span className={`block truncate ${recStyles.primaryClass}`}>{rec.text}</span>
                          <span className="text-slate-500">{rec.unit}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))
          : null}

        {!isRecommendedView && !isHomeView
          ? filteredSections.map((section) => (
              <div key={section.name} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.name)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                >
                  <Chevron expanded={expandedSections[section.name]} />
                  <span className="text-sm font-semibold text-slate-300">{section.name}</span>
                  <span className="text-xs text-slate-500">({section.units.length})</span>
                </button>

                {expandedSections[section.name] ? (
                  <div className="ml-4 border-l border-white/10 pl-3">
                    {section.units.map((unit) => {
                      const unitStyles = unit.race ? getFactionStyles(unit.race) : config;
                      return (
                        <button
                          key={`${section.name}-${unit.name}`}
                          type="button"
                          onClick={() => onSelectUnit(unit)}
                          className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            selectedUnit?.name === unit.name
                              ? `${unitStyles.selectedBg} ${unitStyles.primaryClass}`
                              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                          }`}
                        >
                          {unit.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))
          : null}
      </div>

      <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-500">{selectedGame.attribution}</div>
    </aside>
  );
}
