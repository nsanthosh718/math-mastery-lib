import { useState } from 'react';
import ProfilePicker from './components/ProfilePicker.jsx';
import ChildHome from './components/ChildHome.jsx';
import WeekView from './components/WeekView.jsx';
import ParentDashboard from './components/ParentDashboard.jsx';
import { useApp } from './state/AppContext.jsx';

/**
 * Screen routing is a small state machine rather than a router — the app has
 * four screens and no need for URLs yet. Swapping in react-router later touches
 * only this file.
 */
export default function App() {
  const { loaded } = useApp();
  const [route, setRoute] = useState({ name: 'profiles' });

  if (!loaded) return <div className="screen screen--center">Loading…</div>;

  switch (route.name) {
    case 'child':
      return (
        <ChildHome
          childId={route.childId}
          onOpenWeek={(week) => setRoute({ name: 'week', childId: route.childId, week })}
          onBack={() => setRoute({ name: 'profiles' })}
        />
      );
    case 'week':
      return (
        <WeekView
          childId={route.childId}
          weekNumber={route.week}
          onBack={() => setRoute({ name: 'child', childId: route.childId })}
        />
      );
    case 'parent':
      return (
        <ParentDashboard
          onBack={() => setRoute({ name: 'profiles' })}
          onOpenChild={(childId) => setRoute({ name: 'child', childId })}
        />
      );
    default:
      return (
        <ProfilePicker
          onPick={(childId) => setRoute({ name: 'child', childId })}
          onParent={() => setRoute({ name: 'parent' })}
        />
      );
  }
}
