import { useApp } from '../state/AppContext.jsx';

/** Landing screen: pick a child, or go to the parent view. */
export default function ProfilePicker({ onPick, onParent }) {
  const { state, views } = useApp();

  return (
    <div className="screen screen--center">
      <header className="brand">
        <h1 className="brand__title">MathTrack</h1>
        <p className="brand__tagline">Twelve weeks of thinking, not drilling.</p>
      </header>

      <div className="profile-grid">
        {state.children.map((child) => {
          const view = views[child.id];
          const alerts = view.events.filter((e) => e.severity === 'alert').length;
          return (
            <button key={child.id} className="profile-card" onClick={() => onPick(child.id)}>
              <span className="profile-card__initial">{child.name.trim().charAt(0) || '?'}</span>
              <span className="profile-card__name">{child.name}</span>
              <span className="profile-card__meta">{view.track.gradeLabel}</span>
              <span className="profile-card__stats">
                Week {view.currentWeek} · {view.weeksDone}/12 done · {view.streak.current} day streak
              </span>
              {alerts > 0 && <span className="pill pill--alert">{alerts} needs attention</span>}
            </button>
          );
        })}
      </div>

      <button className="btn btn--ghost" onClick={onParent}>
        Parent view
      </button>
    </div>
  );
}
