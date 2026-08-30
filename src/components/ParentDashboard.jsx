import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { BUILT_IN_RULES } from '../lib/rules.js';
import { strandBalance } from '../data/curriculum/index.js';
import { TRACK_LIST } from '../data/curriculum/index.js';

const RATINGS = [
  { value: 1, label: 'Procedural only' },
  { value: 2, label: 'Some reasoning' },
  { value: 3, label: 'Explains well' },
  { value: 4, label: 'Flexible, multiple paths' },
];

export default function ParentDashboard({ onBack, onOpenChild }) {
  const { state, views, dispatch, today } = useApp();
  const [tab, setTab] = useState('progress');

  return (
    <div className="screen">
      <button className="btn btn--ghost btn--back" onClick={onBack}>
        ← Home
      </button>
      <h1>Parent view</h1>

      <nav className="tabs">
        {['progress', 'reasoning', 'settings'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'tab--on' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'progress' && <ProgressTab views={views} onOpenChild={onOpenChild} />}
      {tab === 'reasoning' && <ReasoningTab views={views} dispatch={dispatch} today={today} />}
      {tab === 'settings' && <SettingsTab state={state} views={views} dispatch={dispatch} />}
    </div>
  );
}

function ProgressTab({ views, onOpenChild }) {
  return (
    <>
      {Object.values(views).map((view) => {
        const minutes = Object.values(view.progressByWeek).reduce(
          (a, p) => a + p.secondsOnTask,
          0,
        ) / 60;
        return (
          <section key={view.child.id} className="card">
            <h2>{view.child.name}</h2>
            <p className="muted">{view.track.gradeLabel}</p>
            <div className="stat-row">
              <Stat label="Weeks done" value={`${view.weeksDone}/12`} />
              <Stat label="On week" value={view.currentWeek} />
              <Stat label="Streak" value={`${view.streak.current}d`} />
              <Stat label="Time on task" value={`${Math.round(minutes)}m`} />
            </div>

            {view.events.length === 0 ? (
              <p className="notice notice--ok">Nothing needs attention.</p>
            ) : (
              view.events.map((event, i) => (
                <div key={i} className={`notice notice--${event.severity}`}>
                  <strong>{event.title}</strong>
                  <span>{event.detail}</span>
                </div>
              ))
            )}

            <button className="btn btn--secondary" onClick={() => onOpenChild(view.child.id)}>
              Open {view.child.name}&rsquo;s weeks
            </button>
          </section>
        );
      })}
    </>
  );
}

/**
 * Reasoning quality is a human judgment, logged per week after reading the
 * child's explanations. It is deliberately not auto-graded — nothing in the app
 * can tell whether a child understood, only whether they clicked.
 */
function ReasoningTab({ views, dispatch, today }) {
  return (
    <>
      <p className="muted">
        After reviewing a week&rsquo;s explanations with your child, log how the thinking looked.
        This is never computed from clicks — it is your read of their reasoning.
      </p>
      {Object.values(views).map((view) => (
        <section key={view.child.id} className="card">
          <h2>{view.child.name}</h2>
          {view.track.weeks
            .filter((w) => view.gates[w.week].unlocked)
            .map((week) => {
              const existing = view.child.reasoningRatings.find((r) => r.week === week.week);
              return (
                <div key={week.week} className="rating-row">
                  <span className="rating-row__week">
                    W{week.week} · {week.theme}
                  </span>
                  <div className="row row--wrap">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        className={`chip ${existing?.rating === r.value ? 'chip--on' : ''}`}
                        onClick={() =>
                          dispatch({
                            type: 'log-reasoning-rating',
                            childId: view.child.id,
                            week: week.week,
                            date: today,
                            rating: r.value,
                            note: existing?.note ?? '',
                          })
                        }
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          {view.track.weeks.every((w) => !view.gates[w.week].unlocked) && (
            <p className="muted">No weeks open yet.</p>
          )}
        </section>
      ))}
    </>
  );
}

function SettingsTab({ state, views, dispatch }) {
  const s = state.settings;
  const patch = (p) => dispatch({ type: 'set-settings', patch: p });

  return (
    <>
      <section className="card">
        <h2>Schedule</h2>
        <Field label="Start date">
          <input
            type="date"
            value={s.startDate ?? ''}
            onChange={(e) => patch({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Days between weeks">
          <input
            type="number"
            min="1"
            max="28"
            value={s.cadenceDays}
            onChange={(e) => patch({ cadenceDays: Number(e.target.value) || 7 })}
          />
        </Field>
        <Field label={`Completion threshold (${Math.round(s.completionThreshold * 100)}%)`}>
          <input
            type="range"
            min="0.4"
            max="1"
            step="0.05"
            value={s.completionThreshold}
            onChange={(e) => patch({ completionThreshold: Number(e.target.value) })}
          />
        </Field>
      </section>

      <section className="card">
        <h2>Profiles</h2>
        {state.children.map((child) => (
          <div key={child.id} className="field-group">
            <Field label="Name">
              <input
                value={child.name}
                onChange={(e) =>
                  dispatch({ type: 'set-child', childId: child.id, patch: { name: e.target.value } })
                }
              />
            </Field>
            <Field label="Curriculum track">
              <select
                value={child.trackId}
                onChange={(e) =>
                  dispatch({
                    type: 'set-child',
                    childId: child.id,
                    patch: { trackId: e.target.value },
                  })
                }
              >
                {TRACK_LIST.map((t) => (
                  <option key={t.trackId} value={t.trackId}>
                    {t.gradeLabel}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Accountability rules</h2>
        <p className="muted">
          Rules only raise events; what you do about them is yours to decide. Add a rule in
          <code> src/lib/rules.js</code> and it appears here.
        </p>
        {BUILT_IN_RULES.map((rule) => (
          <label key={rule.id} className="switch">
            <input
              type="checkbox"
              checked={s.enabledRules.includes(rule.id)}
              onChange={(e) =>
                patch({
                  enabledRules: e.target.checked
                    ? [...s.enabledRules, rule.id]
                    : s.enabledRules.filter((id) => id !== rule.id),
                })
              }
            />
            <span>
              <strong>{rule.label}</strong>
              <span className="muted"> — {rule.description}</span>
            </span>
          </label>
        ))}
        <Field label="Privilege managed elsewhere">
          <input
            value={s.privilegeName}
            onChange={(e) => patch({ privilegeName: e.target.value })}
          />
        </Field>
        <Field label="Grace days before a hold">
          <input
            type="number"
            min="0"
            max="14"
            value={s.privilegeGraceDays}
            onChange={(e) => patch({ privilegeGraceDays: Number(e.target.value) || 0 })}
          />
        </Field>
      </section>

      <section className="card">
        <h2>Unlock a week early</h2>
        <p className="muted">Overrides both the schedule and the completion gate, one week at a time.</p>
        {Object.values(views).map((view) => (
          <div key={view.child.id} className="field-group">
            <p>
              <strong>{view.child.name}</strong>
            </p>
            <div className="row row--wrap">
              {view.track.weeks.map((w) => (
                <button
                  key={w.week}
                  className={`chip ${view.child.overrides.includes(w.week) ? 'chip--on' : ''}`}
                  onClick={() =>
                    dispatch({ type: 'toggle-override', childId: view.child.id, week: w.week })
                  }
                >
                  {w.week}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Curriculum balance</h2>
        {TRACK_LIST.map((track) => {
          const b = strandBalance(track);
          return (
            <p key={track.trackId} className="muted">
              <strong>{track.gradeLabel}:</strong> {b.total} problems ·{' '}
              {Math.round(b.reasoningShare * 100)}% reasoning / {100 - Math.round(b.reasoningShare * 100)}%
              direct instruction
            </p>
          );
        })}
      </section>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
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
