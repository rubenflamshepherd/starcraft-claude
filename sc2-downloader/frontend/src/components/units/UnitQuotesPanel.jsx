import QuoteCategory from '../QuoteCategory';
import { getFactionStyles } from '../../utils/factionStyles';

export default function UnitQuotesPanel({ unit, race, recommendedSetup, onAddRecommendation, selectedGame }) {
  if (!unit) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <div className="text-center">
          <svg className="mx-auto mb-4 h-16 w-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p>Select a unit to view quotations</p>
        </div>
      </div>
    );
  }

  const effectiveRace = unit?.race || race;
  const primaryClass = getFactionStyles(effectiveRace).primaryClass;

  return (
    <div className="h-full overflow-y-auto px-5 py-5 md:px-6">
      <h1 className={`mb-5 text-2xl font-bold ${primaryClass}`}>{unit.name}</h1>

      {unit.categories.map((category, index) => (
        <QuoteCategory
          key={index}
          category={category}
          race={effectiveRace}
          unitName={unit.name}
          recommendedSetup={recommendedSetup}
          onAddRecommendation={onAddRecommendation}
          game={selectedGame?.id}
        />
      ))}
    </div>
  );
}
