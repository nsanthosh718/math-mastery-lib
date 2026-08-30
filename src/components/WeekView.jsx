import ProblemCard from './ProblemCard.jsx';
import { useApp } from '../state/AppContext.jsx';
import { formatFriendly } from '../lib/dates.js';

export default function WeekView({ childId, weekNumber, onBack }) {
  const { views, state, dispatch } = useApp();
  const view = views[childId];
  const week = view.track.weeks.find((w) => w.week === weekNumber);
  const gate = view.gates[weekNumber];
  const progress = view.progressByWeek[weekNumber];
  const threshold = Math.round(state.settings.completionThreshold * 100);

  return (
    <div className="screen">
      <button className="btn btn--ghost btn--back" onClick={onBack}>
        ← {view.child.name}
      </button>

      <header className="week-head">
        <p className="eyebrow">
          Week {week.week} {week.cumulativeReview && '· Cumulative review'}
        </p>
        <h1>{week.theme}</h1>
        <p className="week-head__idea">{week.bigIdea}</p>
        <p className="week-head__dates">
          Opens {formatFriendly(gate.releaseDate)} · due {formatFriendly(gate.dueDate)}
        </p>
        <ProgressBar progress={progress} threshold={state.settings.completionThreshold} />
        <p className="muted">
          {progress.reviewed} of {progress.total} finished and reviewed — {threshold}% completes the
          week and unlocks the next one.
        </p>
      </header>

      <section className="card card--instruction">
        <p className="eyebrow">
          Start here · about {week.instruction.minutes} minutes
        </p>
        <h2>{week.instruction.title}</h2>
        {week.instruction.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {week.instruction.vocabulary.length > 0 && (
          <dl className="vocab">
            {week.instruction.vocabulary.map((v) => (
              <div key={v.term} className="vocab__row">
                <dt>{v.term}</dt>
                <dd>{v.meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="card card--mental">
        <p className="eyebrow">Mental math this week</p>
        <h3>{week.mentalMath.strategy}</h3>
        <p>{week.mentalMath.howToPractice}</p>
      </section>

      <h2 className="section-title">Problems</h2>
      {week.problems.map((problem, i) => (
        <ProblemCard key={problem.id} problem={problem} childId={childId} index={i} />
      ))}

      <button
        className="btn btn--ghost btn--danger"
        onClick={() =>
          dispatch({
            type: 'reset-week',
            childId,
            problemIds: week.problems.map((p) => p.id),
          })
        }
      >
        Clear this week and start over
      </button>
    </div>
  );
}

export function ProgressBar({ progress, threshold }) {
  const pct = Math.round(progress.ratio * 100);
  return (
    <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`bar__fill ${progress.complete ? 'bar__fill--done' : ''}`}
        style={{ width: `${pct}%` }}
      />
      <div className="bar__threshold" style={{ left: `${threshold * 100}%` }} />
    </div>
  );
}
