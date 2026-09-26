import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ViewMode = 'detail' | 'overview';

const ViewModeContext = createContext<{
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  isOverview: boolean;
} | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isOverview: viewMode === 'overview' }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode requires ViewModeProvider');
  return ctx;
}
