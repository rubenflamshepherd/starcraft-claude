import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [selectedQuotes, setSelectedQuotes] = useState(new Map());

  const isSelected = useCallback((quote) => {
    return selectedQuotes.has(quote.audioUrl);
  }, [selectedQuotes]);

  const toggleSelection = useCallback((quote, metadata) => {
    setSelectedQuotes(prev => {
      const next = new Map(prev);
      if (next.has(quote.audioUrl)) {
        next.delete(quote.audioUrl);
      } else {
        next.set(quote.audioUrl, { quote, ...metadata });
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((quotes, metadata) => {
    setSelectedQuotes(prev => {
      const next = new Map(prev);
      for (const quote of quotes) {
        next.set(quote.audioUrl, { quote, ...metadata });
      }
      return next;
    });
  }, []);

  const deselectAll = useCallback((quotes) => {
    setSelectedQuotes(prev => {
      const next = new Map(prev);
      for (const quote of quotes) {
        next.delete(quote.audioUrl);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedQuotes(new Map());
  }, []);

  const selectedArray = useMemo(() => {
    return Array.from(selectedQuotes.values());
  }, [selectedQuotes]);

  const selectedCount = selectedQuotes.size;

  const value = useMemo(() => ({
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    clearSelection,
    selectedArray,
    selectedCount,
  }), [isSelected, toggleSelection, selectAll, deselectAll, clearSelection, selectedArray, selectedCount]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
