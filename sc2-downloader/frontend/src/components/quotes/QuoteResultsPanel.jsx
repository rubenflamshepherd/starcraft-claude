import QuoteSearchResults from '../QuoteSearchResults';

export default function QuoteResultsPanel({ sections, searchQuery, race }) {
  return <QuoteSearchResults sections={sections} searchQuery={searchQuery} race={race} />;
}
