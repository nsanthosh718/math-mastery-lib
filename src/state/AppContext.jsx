import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { reducer, initialState, hydrate } from '../lib/state.js';
import { createLocalStorageAdapter } from '../lib/storage.js';
import { todayISO } from '../lib/dates.js';
import { getTrack } from '../data/curriculum/index.js';
import { trackProgress, currentWeekNumber, weeksCompleted } from '../lib/progress.js';
import { allGateStatuses } from '../lib/gating.js';
import { streakSummary } from '../lib/streak.js';
import { createRuleEngine } from '../lib/rules.js';

const AppContext = createContext(null);
const engine = createRuleEngine();

export function AppProvider({ children, adapter, today = todayISO() }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(today));
  const [loaded, setLoaded] = useState(false);

  // Held in a ref so a re-render never produces a new adapter identity. An
  // adapter recreated each render would re-run the load effect below and
  // clobber in-memory progress with the last snapshot written to storage.
  const persistence = useRef(null);
  if (persistence.current === null) {
    persistence.current = adapter ?? createLocalStorageAdapter();
  }

  // Load exactly once. The ref guard also protects against a slow load
  // resolving after the child has already started work.
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (hasLoaded.current) return undefined;
    let cancelled = false;
    persistence.current.load().then((saved) => {
      if (cancelled) return;
      hasLoaded.current = true;
      if (saved) dispatch({ type: 'replace', state: hydrate(saved, today) });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    if (loaded) persistence.current.save(state);
  }, [state, loaded]);

  const value = useMemo(() => {
    const views = {};
    for (const child of state.children) {
      const track = getTrack(child.trackId);
      const threshold = state.settings.completionThreshold;
      const progressByWeek = trackProgress(track, child, threshold);
      const gates = allGateStatuses(track, child, state.settings, today);
      const streak = streakSummary(child, state.settings.startDate, today);
      const events = engine.evaluate(
        { child, track, settings: state.settings, gates, progressByWeek, streak, today },
        state.settings.enabledRules,
      );
      views[child.id] = {
        child,
        track,
        progressByWeek,
        gates,
        streak,
        events,
        currentWeek: currentWeekNumber(track, child, threshold),
        weeksDone: weeksCompleted(track, child, threshold),
      };
    }
    return { state, dispatch, today, views, loaded };
  }, [state, today, loaded]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside an AppProvider');
  return ctx;
}
