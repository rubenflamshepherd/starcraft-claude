import { useState, useMemo } from 'react';
import QuoteLine from './QuoteLine';
import { useSelection } from '../contexts/SelectionContext';
import { getFactionStyles } from '../utils/factionStyles';

export default function QuoteCategory({ category, race = 'protoss', unitName = '', recommendedSetup = null, onAddRecommendation = null, game = 'sc2' }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { isSelected, selectAll, deselectAll, selectedCount } = useSelection();

  const styles = getFactionStyles(race);
  const primaryClass = styles.primaryClass;
  const borderClass = styles.borderClass;
  const secondaryBg = styles.secondaryBg;
  const secondaryHoverBg = styles.secondaryHover;

  const allSelected = useMemo(() => {
    return category.quotes.length > 0 && category.quotes.every(q => isSelected(q));
  }, [category.quotes, isSelected]);

  const handleSelectAll = (e) => {
    e.stopPropagation();
    const metadata = { unitName, categoryName: category.name, race };
    if (allSelected) {
      deselectAll(category.quotes);
    } else {
      selectAll(category.quotes, metadata);
    }
  };

  const showSelectAll = selectedCount > 0 || allSelected;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-grow text-left py-2 px-3 rounded hover:bg-white/5 transition-colors"
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <polygon points="8,5 19,12 8,19" />
          </svg>
          <span className={`${primaryClass} font-medium`}>{category.name}</span>
          <span className="text-gray-500 text-sm">({category.quotes.length})</span>
        </button>
        <button
          onClick={handleSelectAll}
          className={`text-xs px-2 py-1 rounded ${secondaryBg} ${secondaryHoverBg} text-gray-300 transition-opacity ${
            showSelectAll ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {isExpanded && (
        <div className={`ml-4 border-l ${borderClass} pl-2`}>
          {category.quotes.map((quote, index) => (
            <QuoteLine
              key={index}
              quote={quote}
              race={race}
              unitName={unitName}
              categoryName={category.name}
              recommendedSetup={recommendedSetup}
              onAddRecommendation={onAddRecommendation}
              game={game}
            />
          ))}
        </div>
      )}
    </div>
  );
}
