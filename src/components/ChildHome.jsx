import { useApp } from '../state/AppContext.jsx';
import { describeLockReason } from '../lib/gating.js';
import { ProgressBar } from './WeekView.jsx';

export default function ChildHome({ childId, onOpenWeek, onBack }) {
  const { views, state } = useApp();
  const view = views[childId];
  const { child, track, streak, weeksDone } = view;

  return (
    <div className="screen">
      <button className="btn btn--ghost btn--back" onClick={onBack}>
        ← Switch profile
      </button>

      <header className="child-head">
        <h1>{child.name}</h1>
        <p className="muted">{track.title}</p>
      </header>

      <div className="stat-row">
        <Stat label="Weeks done" value={`${weeksDone}/12`} />
        <Stat label="Current streak" value={`${streak.current}d`} />
        <Stat label="Best streak" value={`${streak.longest}d`} />
        <Stat label="Consistency" value={`${Math.round(streak.consistency * 100)}%`} />
      </div>

      {view.events.length > 0 && (
        <section className="notices">
          {view.events.map((event, i) => (
            <div key={`${event.ruleId}-${event.week ?? i}`} className={`notice notice--${event.severity}`}>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </div>
          ))}
        </section>
      )}

      <h2 className="section-title">The 12 weeks</h2>
      <ol className="week-list">
        {track.weeks.map((week) => {
          const gate = view.gates[week.week];
          const progress = view.progressByWeek[week.week];
          return (
            <li key={week.week}>
              <button
                className={`week-row ${gate.unlocked ? '' : 'week-row--locked'} ${
                  progress.complete ? 'week-row--done' : ''
                }`}
                disabled={!gate.unlocked}
                onClick={() => onOpenWeek(week.week)}
              >
                <span className="week-row__num">{week.week}</span>
                <span className="week-row__body">
                  <span className="week-row__theme">{week.theme}</span>
                  {gate.unlocked ? (
                    <ProgressBar
                      progress={progress}
                      threshold={state.settings.completionThreshold}
                    />
                  ) : (
                    <span className="week-row__lock">
                      🔒 {describeLockReason(gate.reason, gate)}
                    </span>
                  )}
                </span>
                <span className="week-row__count">
                  {gate.unlocked ? `${progress.reviewed}/${progress.total}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
