import { useMemo } from 'react';
import QuoteLine from './QuoteLine';
import { getFactionStyles } from '../utils/factionStyles';

export default function QuoteSearchResults({ sections, searchQuery, race = 'protoss' }) {
  const defaultStyles = getFactionStyles(race);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const matches = [];

    for (const section of sections) {
      for (const unit of section.units) {
        for (const category of unit.categories) {
          for (const quote of category.quotes) {
            if (quote.text.toLowerCase().includes(query)) {
              matches.push({
                quote,
                unitName: unit.name,
                categoryName: category.name,
                race: unit.race || race,
              });
            }
          }
        }
      }
    }

    return matches;
  }, [sections, searchQuery, race]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>Type to search quotes...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No quotes found for "{searchQuery}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${defaultStyles.primaryClass}`}>Search Results</h1>
        <span className="text-gray-400 text-sm">{results.length} quotes found</span>
      </div>

      <div className="space-y-1">
        {results.map((result, index) => {
          const styles = getFactionStyles(result.race);
          return (
            <div key={index} className="rounded hover:bg-white/5">
              <div className="flex items-center gap-2 px-3 pt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${styles.badgeBg} ${styles.primaryClass}`}>
                  {result.unitName}
                </span>
                <span className="text-xs text-gray-500">{result.categoryName}</span>
              </div>
              <QuoteLine quote={result.quote} race={result.race} unitName={result.unitName} categoryName={result.categoryName} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
