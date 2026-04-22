import { useEffect, useState } from 'react';
import type { AppState } from './types';
import { loadState, saveState } from './storage';
import { TodayView } from './components/TodayView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <div className="mx-auto min-h-screen max-w-md">
      {settingsOpen ? (
        <SettingsView
          state={state}
          onChange={setState}
          onClose={() => setSettingsOpen(false)}
        />
      ) : (
        <TodayView
          state={state}
          onChange={setState}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
    </div>
  );
}
