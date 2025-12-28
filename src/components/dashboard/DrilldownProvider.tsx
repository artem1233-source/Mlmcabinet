import { createContext, useContext, useState, ReactNode } from 'react';

interface DrilldownState {
  activeView: string | null;
  params: Record<string, any>;
}

interface DrilldownContextType {
  state: DrilldownState;
  drillDown: (view: string, params?: Record<string, any>) => void;
  drillUp: () => void;
  reset: () => void;
}

const DrilldownContext = createContext<DrilldownContextType | null>(null);

interface DrilldownProviderProps {
  children: ReactNode;
}

export function DrilldownProvider({ children }: DrilldownProviderProps) {
  const [state, setState] = useState<DrilldownState>({
    activeView: null,
    params: {},
  });

  const drillDown = (view: string, params: Record<string, any> = {}) => {
    setState({ activeView: view, params });
  };

  const drillUp = () => {
    setState({ activeView: null, params: {} });
  };

  const reset = () => {
    setState({ activeView: null, params: {} });
  };

  return (
    <DrilldownContext.Provider value={{ state, drillDown, drillUp, reset }}>
      {children}
    </DrilldownContext.Provider>
  );
}

export function useDrilldown() {
  const context = useContext(DrilldownContext);
  if (!context) {
    throw new Error('useDrilldown must be used within a DrilldownProvider');
  }
  return context;
}
