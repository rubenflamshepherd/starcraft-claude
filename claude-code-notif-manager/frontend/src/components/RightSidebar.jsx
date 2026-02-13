import { useMemo, useState } from 'react';
import { getFactionStyles } from '../utils/factionStyles';

export default function RightSidebar({ recommendedSetup, isOpen, onToggle, listName }) {
  const hooks = useMemo(() => recommendedSetup?.hooks || [], [recommendedSetup?.hooks]);
  const [expandedSections, setExpandedSections] = useState({});

  const hooksKey = hooks.map(h => h.name).join(',');
  const [prevHooksKey, setPrevHooksKey] = useState(hooksKey);
  if (hooksKey !== prevHooksKey) {
    setPrevHooksKey(hooksKey);
    setExpandedSections(
      hooks.reduce((acc, hook) => ({ ...acc, [hook.name]: true }), {})
    );
  }

  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  return (
    <aside className="relative h-full w-0 shrink-0">
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-md border border-r-0 border-gray-700 bg-gray-900/95 px-2 py-3 text-gray-300 hover:bg-gray-800 hover:text-amber-300 transition-colors"
        title={isOpen ? 'Hide list sidebar' : 'Show list sidebar'}
        aria-label={isOpen ? 'Hide list sidebar' : 'Show list sidebar'}
      >
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        className={`absolute right-0 top-0 z-30 flex h-full w-80 flex-col border-l border-gray-800 bg-gray-900 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-base font-bold text-amber-400">{listName || 'Active List'}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {hooks.map((hook) => (
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
          ))}
        </div>
      </div>
    </aside>
  );
}
