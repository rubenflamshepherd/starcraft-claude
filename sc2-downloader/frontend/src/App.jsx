import Sidebar from './components/Sidebar';
import UnitPanel from './components/UnitPanel';
import AppShell from './layouts/AppShell';
import { useQuotesAppState } from './hooks/useQuotesAppState';

function getSubtitle(selectedView, selectedGame) {
  if (selectedView === 'recommended') return 'Curated hook-based quote setup';
  if (selectedView === 'home') return `Browse ${selectedGame.name} quotes by faction or unit`;
  return `Exploring ${selectedGame.name}`;
}

function App() {
  const {
    selectedGame,
    selectedView,
    selectedUnit,
    quoteSearchQuery,
    listsState,
    views,
    currentSections,
    isHomeView,
    isRecommendedView,
    selectedFaction,
    recommendedSetup,
    games,
    setSelectedUnit,
    setQuoteSearchQuery,
    handleViewChange,
    handleGameChange,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handleMoveRecommendation,
    handleReorderRecommendations,
    handleImportSetup,
    handleCreateList,
    handleDeleteList,
    handleRenameList,
    handleSetActiveList,
  } = useQuotesAppState();

  const title = selectedView === 'recommended'
    ? `${listsState.lists.find((list) => list.id === listsState.activeListId)?.name || 'Recommended Setup'}`
    : `${selectedGame.name} Quotes`;

  return (
    <div className="app-background">
      <AppShell
        title={title}
        subtitle={getSubtitle(selectedView, selectedGame)}
        sidebar={(
          <Sidebar
            sections={currentSections}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            selectedView={selectedView}
            onViewChange={handleViewChange}
            views={views}
            quoteSearchQuery={quoteSearchQuery}
            onQuoteSearchChange={setQuoteSearchQuery}
            recommendedSetup={recommendedSetup}
            selectedGame={selectedGame}
            games={games}
            onGameChange={handleGameChange}
            lists={listsState.lists}
            activeListId={listsState.activeListId}
          />
        )}
      >
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
          lists={listsState.lists}
          activeListId={listsState.activeListId}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
          onRenameList={handleRenameList}
          onSetActiveList={handleSetActiveList}
        />
      </AppShell>
    </div>
  );
}

export default App;
